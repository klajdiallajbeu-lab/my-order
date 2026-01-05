import express from "express";
import {
  getPeriodStats,
  getTopProducts,
  getWaiterStats,
} from "../controllers/statsController.js";

const router = express.Router();

router.get("/period", getPeriodStats);
router.get("/top-products", getTopProducts);
router.get("/waiters", getWaiterStats);

export default router;
