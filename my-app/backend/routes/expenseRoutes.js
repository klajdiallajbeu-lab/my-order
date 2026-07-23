import express from "express";
import { protectUser } from "../middleware/protectUser.js";
import {
  getExpenses,
  createExpense,
  deleteExpense,
} from "../controllers/expenseController.js";

const router = express.Router();

router.get("/", protectUser, getExpenses);
router.post("/", protectUser, createExpense);
router.delete("/:id", protectUser, deleteExpense);

export default router;