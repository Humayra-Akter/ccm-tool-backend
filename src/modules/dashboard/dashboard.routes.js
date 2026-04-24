import express from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import {
  getDashboardSummary,
  getDashboardTrend,
  getDashboardKpiHealth,
  getDashboardRecentExceptions,
  getDashboardEntityScores,
  getExceptionAnalytics,
  getAllExceptions,
} from "./dashboard.controller.js";

const router = express.Router();

router.get("/summary", protect, getDashboardSummary);
router.get("/trend", protect, getDashboardTrend);
router.get("/kpi-health", protect, getDashboardKpiHealth);
router.get("/recent-exceptions", protect, getDashboardRecentExceptions);
router.get("/entity-scores", protect, getDashboardEntityScores);
router.get("/exceptions-analytics", protect, getExceptionAnalytics);
router.get("/exceptions", protect, getAllExceptions);

export default router;
