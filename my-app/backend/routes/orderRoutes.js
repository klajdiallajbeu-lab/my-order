import express from "express";
import {
  createOrder,
  getOrders,
  getOrderById,      // ✅ shto
  updateOrderStatus,
} from "../controllers/orderController.js";

const router = express.Router();

router.get("/", getOrders);

// ✅ KJO MUNGONTE
router.get("/:id", getOrderById);

router.post("/", createOrder);

router.patch("/:id/status", updateOrderStatus);

export default router;
