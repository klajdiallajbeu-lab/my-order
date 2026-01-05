// backend/routes/inventoryRoutes.js
import express from "express";
import {
  getInventorySummary,
  addSupply,              // ⬅️ SIGUROHU QË ËSHTË KËTU
} from "../controllers/inventoryController.js";

const router = express.Router();

// leximi i inventarit
router.get("/summary", getInventorySummary);

// shtimi i stokut
router.post("/supply", addSupply);

export default router;
