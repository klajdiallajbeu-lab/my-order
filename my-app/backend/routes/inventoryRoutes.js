// backend/routes/inventoryRoutes.js
import express from "express";
import {
  getInventorySummary,
  addSupply,
} from "../controllers/inventoryController.js";

import { protectUser, requireRole } from "../middleware/protectUser.js";

const router = express.Router();

/*
  Këto endpoint-e ishin pa asnjë mbrojtje dhe e merrnin businessId-në
  nga kërkesa. Do të thoshte se kushdo, pa qenë i loguar, mund të
  lexonte inventarin e çdo biznesi dhe të shtonte furnizime në stokun
  e tij.

  Tani:
    - kërkohet token i vlefshëm (protectUser)
    - businessId merret nga token-i (shih inventoryController.readBusinessId)
    - shtimi i stokut lejohet vetëm për manager/admin
*/

// Leximi i inventarit
router.get(
  "/summary",
  protectUser,
  requireRole("manager", "admin"),
  getInventorySummary
);

// Shtimi i stokut
router.post(
  "/supply",
  protectUser,
  requireRole("manager", "admin"),
  addSupply
);

export default router;