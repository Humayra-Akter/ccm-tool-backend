import express from "express";
import {
  uploadMiddleware,
  createUpload,
  listUploads,
  getUploadById,
  downloadUpload,
  retryUpload,
} from "./upload.controller.js";

const router = express.Router();

router.get("/", listUploads);
router.get("/:id", getUploadById);
router.get("/:id/download", downloadUpload);
router.post("/", uploadMiddleware.single("file"), createUpload);
router.post("/:id/retry", retryUpload);

export default router;
