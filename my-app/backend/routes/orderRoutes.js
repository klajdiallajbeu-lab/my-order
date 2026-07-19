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
import { protectWaiter } from "../middleware/protectWaiter.js";
import { protectUser } from "../middleware/protectUser.js";
import { optionalAuth } from "../middleware/optionalAuth.js";

const router = express.Router();

router.post("/close-table", protectWaiter, closeTableOrders);
router.post("/waiter-shift-preview", protectWaiter, getWaiterShiftPreview);
router.post("/close-waiter-shift", protectWaiter, closeWaiterShift);

router.get("/", protectUser, getOrders);
router.post("/", optionalAuth, guestGuardIfClient, createOrder);
router.get("/:id", protectUser, getOrderById);

router.patch("/:id/status", protectWaiter, updateOrderStatus);

export default router;