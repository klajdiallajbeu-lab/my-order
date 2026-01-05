import express from "express";
import {
  adminLogin,
  createBusinessAndManager,
  listBusinesses,
  deleteBusiness,
  getAdminStats, // ✅ SHTO KËTË
} from "../controllers/adminController.js";

const router = express.Router();

// LOGIN i adminit
router.post("/login", adminLogin);

// DASHBOARD STATS ✅
router.get("/stats", getAdminStats);

// KRIJO biznes + menaxher
router.post("/business/create", createBusinessAndManager);

// LISTA e bizneseve
router.get("/business/list", listBusinesses);

// FSHI biznes sipas ID
router.delete("/business/:id", deleteBusiness);

export default router;
