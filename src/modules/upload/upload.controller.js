import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { parse } from "csv-parse/sync";
import xlsx from "xlsx";
import { prisma } from "../../lib/prisma.js";

const uploadDir = path.join(process.cwd(), "storage", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedExtensions = [".csv", ".xls", ".xlsx"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, safeName);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return cb(new Error("Only CSV, XLS, and XLSX files are allowed."));
    }

    cb(null, true);
  },
});

function calculateChecksum(filePath) {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function readRows(filePath, extension) {
  if (extension === ".csv") {
    const content = fs.readFileSync(filePath, "utf8");

    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });
  }

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  return xlsx.utils.sheet_to_json(worksheet, {
    defval: null,
  });
}

function serializeUpload(upload) {
  return {
    ...upload,
    fileSizeBytes: upload.fileSizeBytes?.toString?.() ?? upload.fileSizeBytes,
  };
}

export async function createUpload(req, res) {
  let uploadBatch;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded.",
      });
    }

    const {
      category = "CONTROL_SOURCE_DATA",
      sourceSystem = "MANUAL_UPLOAD",
      controlCode,
      reportingPeriodStart,
      reportingPeriodEnd,
    } = req.body;

    const extension = path.extname(req.file.originalname).toLowerCase();
    const checksum = calculateChecksum(req.file.path);

    let control = null;

    if (controlCode) {
      control = await prisma.control.findUnique({
        where: {
          code: controlCode,
        },
      });

      if (!control) {
        return res.status(400).json({
          message: `Invalid control code: ${controlCode}`,
        });
      }
    }

    uploadBatch = await prisma.uploadBatch.create({
      data: {
        controlId: control?.id,
        uploadedById: req.user?.id || null,
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        storagePath: req.file.path,
        mimeType: req.file.mimetype,
        fileExtension: extension,
        fileSizeBytes: BigInt(req.file.size),
        checksum,
        category,
        sourceSystem,
        reportingPeriodStart: reportingPeriodStart
          ? new Date(reportingPeriodStart)
          : null,
        reportingPeriodEnd: reportingPeriodEnd
          ? new Date(reportingPeriodEnd)
          : null,
        status: "VALIDATING",
        meta: {
          originalEncoding: req.file.encoding,
        },
      },
    });

    const processRun = await prisma.processRun.create({
      data: {
        controlId: control?.id,
        uploadBatchId: uploadBatch.id,
        triggeredById: req.user?.id || null,
        type: "VALIDATION",
        triggerType: "UPLOAD",
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    let rows = [];

    try {
      rows = readRows(req.file.path, extension);

      const rowCount = rows.length;

      if (rowCount === 0) {
        await prisma.uploadRowError.create({
          data: {
            uploadBatchId: uploadBatch.id,
            rowNumber: 0,
            fieldName: null,
            errorCode: "EMPTY_FILE",
            errorMessage: "Uploaded file does not contain any data rows.",
            rawData: {},
          },
        });

        uploadBatch = await prisma.uploadBatch.update({
          where: { id: uploadBatch.id },
          data: {
            status: "FAILED",
            rowCount: 0,
            successRowCount: 0,
            failedRowCount: 1,
            errorMessage: "Uploaded file is empty.",
            completedAt: new Date(),
          },
          include: {
            control: true,
            uploadedBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        });

        await prisma.processRun.update({
          where: { id: processRun.id },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            recordsRead: 0,
            recordsProcessed: 0,
            recordsFailed: 1,
            message: "Uploaded file is empty.",
          },
        });

        return res.status(400).json({
          message: "Uploaded file is empty.",
          upload: serializeUpload(uploadBatch),
        });
      }

      uploadBatch = await prisma.uploadBatch.update({
        where: { id: uploadBatch.id },
        data: {
          status: "COMPLETED",
          rowCount,
          successRowCount: rowCount,
          failedRowCount: 0,
          processingStartedAt: new Date(),
          completedAt: new Date(),
          meta: {
            preview: rows.slice(0, 5),
            columns: Object.keys(rows[0] || {}),
          },
        },
        include: {
          control: true,
          uploadedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      await prisma.processRun.update({
        where: { id: processRun.id },
        data: {
          status: "SUCCESS",
          finishedAt: new Date(),
          recordsRead: rowCount,
          recordsProcessed: rowCount,
          recordsFailed: 0,
          message: "File uploaded and validated successfully.",
        },
      });

      return res.status(201).json({
        message: "File uploaded successfully.",
        upload: serializeUpload(uploadBatch),
      });
    } catch (parseError) {
      uploadBatch = await prisma.uploadBatch.update({
        where: { id: uploadBatch.id },
        data: {
          status: "FAILED",
          errorMessage: parseError.message,
          completedAt: new Date(),
        },
        include: {
          control: true,
          uploadedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      await prisma.processRun.update({
        where: { id: processRun.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          message: parseError.message,
        },
      });

      return res.status(400).json({
        message: "File uploaded, but validation failed.",
        error: parseError.message,
        upload: serializeUpload(uploadBatch),
      });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Upload failed.",
      error: error.message,
    });
  }
}

export async function listUploads(req, res) {
  try {
    const { status, controlCode, category, search } = req.query;

    const where = {};

    if (status) where.status = status;
    if (category) where.category = category;

    if (controlCode) {
      where.control = {
        code: controlCode,
      };
    }

    if (search) {
      where.OR = [
        {
          originalFileName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          fileName: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const uploads = await prisma.uploadBatch.findMany({
      where,
      orderBy: {
        uploadedAt: "desc",
      },
      include: {
        control: true,
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        processRuns: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    res.json({
      uploads: uploads.map(serializeUpload),
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch uploads.",
      error: error.message,
    });
  }
}

export async function getUploadById(req, res) {
  try {
    const upload = await prisma.uploadBatch.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        control: true,
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        rowErrors: true,
        processRuns: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!upload) {
      return res.status(404).json({
        message: "Upload not found.",
      });
    }

    res.json({
      upload: serializeUpload(upload),
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch upload.",
      error: error.message,
    });
  }
}

export async function downloadUpload(req, res) {
  try {
    const upload = await prisma.uploadBatch.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!upload) {
      return res.status(404).json({
        message: "Upload not found.",
      });
    }

    if (!fs.existsSync(upload.storagePath)) {
      return res.status(404).json({
        message: "Uploaded file no longer exists on server.",
      });
    }

    return res.download(upload.storagePath, upload.originalFileName);
  } catch (error) {
    res.status(500).json({
      message: "Could not download upload.",
      error: error.message,
    });
  }
}

export async function retryUpload(req, res) {
  try {
    const existingUpload = await prisma.uploadBatch.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        control: true,
      },
    });

    if (!existingUpload) {
      return res.status(404).json({
        message: "Upload not found.",
      });
    }

    if (!fs.existsSync(existingUpload.storagePath)) {
      return res.status(404).json({
        message: "Original file is missing from storage.",
      });
    }

    const run = await prisma.processRun.create({
      data: {
        controlId: existingUpload.controlId,
        uploadBatchId: existingUpload.id,
        triggeredById: req.user?.id || null,
        type: "VALIDATION",
        triggerType: "MANUAL",
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    const rows = readRows(
      existingUpload.storagePath,
      existingUpload.fileExtension,
    );

    const updatedUpload = await prisma.uploadBatch.update({
      where: {
        id: existingUpload.id,
      },
      data: {
        status: "COMPLETED",
        rowCount: rows.length,
        successRowCount: rows.length,
        failedRowCount: 0,
        errorMessage: null,
        processingStartedAt: new Date(),
        completedAt: new Date(),
        meta: {
          preview: rows.slice(0, 5),
          columns: Object.keys(rows[0] || {}),
          retriedAt: new Date().toISOString(),
        },
      },
      include: {
        control: true,
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    await prisma.processRun.update({
      where: {
        id: run.id,
      },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        recordsRead: rows.length,
        recordsProcessed: rows.length,
        recordsFailed: 0,
        message: "Retry completed successfully.",
      },
    });

    res.json({
      message: "Upload retry completed.",
      upload: serializeUpload(updatedUpload),
    });
  } catch (error) {
    res.status(500).json({
      message: "Retry failed.",
      error: error.message,
    });
  }
}
