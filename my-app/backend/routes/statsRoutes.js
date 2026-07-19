import express from "express";
import {
  getPeriodStats,
  getTopProducts,
  getWaiterStats,
  getOverviewStats,
} from "../controllers/statsController.js";

import { protectUser, requireRole } from "../middleware/protectUser.js";

const router = express.Router();

router.get(
  "/period",
  protectUser,
  requireRole("manager", "admin"),
  getPeriodStats
);

router.get(
  "/top-products",
  protectUser,
  requireRole("manager", "admin"),
  getTopProducts
);

router.get(
  "/waiters",
  protectUser,
  requireRole("manager", "admin"),
  getWaiterStats
);

router.get(
  "/overview",
  protectUser,
  requireRole("manager", "admin"),
  getOverviewStats
);

export default router;