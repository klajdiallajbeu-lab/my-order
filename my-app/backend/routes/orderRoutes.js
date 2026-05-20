import express from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  closeTableOrders,
  closeWaiterShift,
  getWaiterShiftPreview,
} from "../controllers/orderController.js";

import { guestGuardIfClient } from "../middleware/guestGuardIfClient.js";

const router = express.Router();

// GET /api/orders?businessId=...&...
router.get("/", getOrders);

// GET /api/orders/:id
router.get("/:id", getOrderById);

// PATCH /api/orders/:id/status
router.patch("/:id/status", updateOrderStatus);

// POST /api/orders/close-table
router.post("/close-table", closeTableOrders);

// POST /api/orders/waiter-shift-preview
router.post("/waiter-shift-preview", getWaiterShiftPreview);

// POST /api/orders/close-waiter-shift
router.post("/close-waiter-shift", closeWaiterShift);

// POST /api/orders
router.post("/", guestGuardIfClient, createOrder);

export default router;