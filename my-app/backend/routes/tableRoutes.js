import express from "express";
import {
  getOpenTables,
  addOrderToTable,
  closeTable,
  closeShift,
  getTableInvoiceById,
} from "../controllers/tableController.js";

import { protectWaiter } from "../middleware/protectWaiter.js";


const router = express.Router();

router.get("/open", protectWaiter, getOpenTables);
router.post("/order", protectWaiter, addOrderToTable);
router.patch("/close/:id", protectWaiter, closeTable);
router.post("/close-shift", protectWaiter, closeShift);
router.get("/invoice/:id", protectWaiter, getTableInvoiceById);
export default router;