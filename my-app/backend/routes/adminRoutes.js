import express from "express";
import {
  adminLogin,
  createBusinessAndManager,
  listBusinesses,
  deleteBusiness,
  getAdminStats,
  getBusinessUsageStats,
  getBusinessUsageHistory,
  getBusinessPriceRecommendation,
} from "../controllers/adminController.js";

import { protectAdmin } from "../middleware/protectAdmin.js";

const router = express.Router();

router.post("/login", adminLogin);

router.get("/stats", protectAdmin, getAdminStats);
router.get("/business-usage-stats", protectAdmin, getBusinessUsageStats);
router.get("/business/:businessId/history", protectAdmin, getBusinessUsageHistory);
router.get("/business/:businessId/price-recommendation", protectAdmin, getBusinessPriceRecommendation);

router.post("/business/create", protectAdmin, createBusinessAndManager);
router.get("/business/list", protectAdmin, listBusinesses);
router.delete("/business/:id", protectAdmin, deleteBusiness);

export default router;