// controllers/expenseController.js
import mongoose from "mongoose";
import Expense, { EXPENSE_CATEGORIES } from "../models/Expense.js";
import { isMonthClosed } from "../models/PeriodClose.js";

const makeDateRange = (from, to) => {
  const range = {};

  if (from) range.$gte = new Date(`${from}T00:00:00+02:00`);
  if (to) range.$lte = new Date(`${to}T23:59:59.999+02:00`);

  return Object.keys(range).length ? range : null;
};

// businessId merret nga token-i (si te statsController); admin-i mund ta japi me query
const getBusinessIdFromAuth = (req) => {
  const role = String(req.user?.role || "").toLowerCase();

  if (role === "admin") {
    return String(req.query.businessId || req.body?.businessId || "").trim();
  }

  return String(req.user?.businessId || "").trim();
};

// GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getExpenses = async (req, res) => {
  try {
    const businessId = getBusinessIdFromAuth(req);

    if (!businessId) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }

    const { from, to } = req.query;
    const dateRange = makeDateRange(from, to);

    const filter = {
      businessId: new mongoose.Types.ObjectId(businessId),
      ...(dateRange ? { date: dateRange } : {}),
    };

    const expenses = await Expense.find(filter).sort({ date: -1 }).lean();

    const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Totali per cdo kategori (per permbledhjen e raportit)
    const byCategory = {};
    for (const cat of EXPENSE_CATEGORIES) byCategory[cat] = 0;
    for (const e of expenses) {
      byCategory[e.category] =
        (byCategory[e.category] || 0) + Number(e.amount || 0);
    }

    return res.json({ expenses, total, byCategory });
  } catch (err) {
    console.error("getExpenses:", err);
    return res
      .status(500)
      .json({ message: "Gabim në server", error: err.message });
  }
};

// POST /api/expenses  { category, amount, note?, date? }
export const createExpense = async (req, res) => {
  try {
    const businessId = getBusinessIdFromAuth(req);

    if (!businessId) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }

    const category = String(req.body?.category || "").trim().toLowerCase();
    const amount = Number(req.body?.amount);
    const note = String(req.body?.note || "").trim().slice(0, 300);
    const dateRaw = String(req.body?.date || "").trim();

    if (!EXPENSE_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Kategori e pavlefshme" });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Shuma duhet të jetë > 0" });
    }

    const date = dateRaw ? new Date(`${dateRaw}T12:00:00+02:00`) : new Date();

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: "Datë e pavlefshme" });
    }

    // MBROJTJE: periudha e mbyllur nuk pranon shpenzime te reja
    if (await isMonthClosed(businessId, date)) {
      return res.status(423).json({
        message:
          "Kjo periudhë është e mbyllur. Nuk mund të shtohen shpenzime të reja.",
      });
    }

    const expense = await Expense.create({
      businessId,
      category,
      amount,
      note,
      date,
      createdBy: String(req.user?.name || req.user?.role || ""),
    });

    return res.status(201).json(expense);
  } catch (err) {
    console.error("createExpense:", err);
    return res
      .status(500)
      .json({ message: "Gabim në server", error: err.message });
  }
};

// DELETE /api/expenses/:id
export const deleteExpense = async (req, res) => {
  try {
    const businessId = getBusinessIdFromAuth(req);
    const { id } = req.params;

    if (!businessId) {
      return res.status(400).json({ message: "businessId është i detyrueshëm" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "id e pavlefshme" });
    }

    // Gjej i pari qe te dime daten — dhe vetem brenda biznesit te vet
    const existing = await Expense.findOne({ _id: id, businessId }).lean();

    if (!existing) {
      return res.status(404).json({ message: "Shpenzimi nuk u gjet" });
    }

    // MBROJTJE: periudha e mbyllur nuk lejon fshirje
    if (await isMonthClosed(businessId, existing.date)) {
      return res.status(423).json({
        message:
          "Kjo periudhë është e mbyllur. Shpenzimet e saj nuk mund të fshihen.",
      });
    }

    await Expense.deleteOne({ _id: id, businessId });

    return res.json({ ok: true });
  } catch (err) {
    console.error("deleteExpense:", err);
    return res
      .status(500)
      .json({ message: "Gabim në server", error: err.message });
  }
};