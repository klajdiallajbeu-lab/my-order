import express from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/orderController.js";

import { guestGuardIfClient } from "../middleware/guestGuardIfClient.js"; // ✅

const router = express.Router();

// GET /api/orders?businessId=...&...
router.get("/", getOrders);

// GET /api/orders/:id
router.get("/:id", getOrderById);

// PATCH /api/orders/:id/status
router.patch("/:id/status", updateOrderStatus);

// ✅ POST /api/orders
router.post("/", guestGuardIfClient, createOrder);

export default router;
