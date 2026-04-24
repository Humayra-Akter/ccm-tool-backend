import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../../lib/prisma.js";

export async function getKpiControls(req, res, next) {
  try {
    const controls = await prisma.control.findMany({
      where: {
        isEnabled: true,
      },
      orderBy: {
        displayOrder: "asc",
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        category: true,
        uiConfig: true,
      },
    });

    return res.json({
      success: true,
      data: controls,
    });
  } catch (error) {
    next(error);
  }
}

export async function getKpiReportByControl(req, res, next) {
  try {
    const { controlCode } = req.params;

    const control = await prisma.control.findUnique({
      where: { code: controlCode },
      include: {
        reportMappings: {
          where: { isDefault: true },
          include: { report: true },
          orderBy: { effectiveFrom: "desc" },
          take: 1,
        },
      },
    });

    if (!control) {
      return res.status(404).json({
        success: false,
        message: "Control not found",
      });
    }

    const mapping = control.reportMappings?.[0];
    const report = mapping?.report || null;

    if (
      mapping?.prototypeMode &&
      report?.metadata?.demoType === "PDF_PREVIEW"
    ) {
      return res.json({
        success: true,
        data: {
          state: "DEMO_PDF",
          control: {
            code: control.code,
            name: control.name,
            description: control.description,
            category: control.category,
          },
          report: {
            reportName: report.reportName,
            sourceSystem: report.sourceSystem,
            lastRefreshAt: report.lastRefreshAt,
            notes: report.notes,
            pdfUrl: report.metadata?.demoPdfUrl || null,
            metadata: report.metadata,
          },
        },
      });
    }

    if (report?.isPublished && report?.embedUrl) {
      return res.json({
        success: true,
        data: {
          state: "READY",
          control: {
            code: control.code,
            name: control.name,
            description: control.description,
            category: control.category,
          },
          report: {
            reportName: report.reportName,
            embedUrl: report.embedUrl,
            sourceSystem: report.sourceSystem,
            lastRefreshAt: report.lastRefreshAt,
            notes: report.notes,
            pageName: mapping?.pageName || report.pageName || null,
          },
        },
      });
    }

    return res.json({
      success: true,
      data: {
        state: "NO_DATA",
        control: {
          code: control.code,
          name: control.name,
          description: control.description,
          category: control.category,
        },
        report: null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getKpiDemoPdf(req, res, next) {
  try {
    const { controlCode } = req.params;

    if (controlCode !== "DORMANT_PO") {
      return res.status(404).json({
        success: false,
        message: "Demo PDF not available for this control",
      });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const pdfPath = path.join(
      __dirname,
      "../../../public/demo/dormant-po-demo-v2.pdf",
    );

    const fileBuffer = await fs.readFile(pdfPath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "inline; filename=dormant-po-demo-v2.pdf",
    );
    res.setHeader("Content-Length", fileBuffer.length.toString());

    return res.send(fileBuffer);
  } catch (error) {
    console.error("getKpiDemoPdf error:", error);
    next(error);
  }
}
