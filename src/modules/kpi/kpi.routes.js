import express from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  getKpiControls,
  getKpiReportByControl,
  getKpiDemoPdf,
} from "./kpi.controller.js";

const router = express.Router();
router.get("/controls", protect, getKpiControls);
router.get("/controls/:controlCode/report", protect, getKpiReportByControl);
router.get("/controls/:controlCode/pdf", protect, getKpiDemoPdf);

export default router;
