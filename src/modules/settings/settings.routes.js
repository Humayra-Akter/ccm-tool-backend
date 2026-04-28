import express from "express";
import {
  getSettings,
  updateSettings,
  resetSettings,
} from "./settings.controller.js";

const router = express.Router();

router.get("/", getSettings);
router.put("/", updateSettings);
router.post("/reset", resetSettings);

export default router;
