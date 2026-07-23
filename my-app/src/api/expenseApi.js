// src/api/expenseApi.js
import { api } from "./http.js";

/* ---------- Shpenzimet ---------- */

// GET /api/expenses?from&to  ->  { expenses, total, byCategory }
export const getExpensesApi = async (from, to) => {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;

  const res = await api.get("/expenses", { params });
  return res.data;
};

// POST /api/expenses  { category, amount, note?, date? }
export const createExpenseApi = async ({ category, amount, note, date }) => {
  const res = await api.post("/expenses", { category, amount, note, date });
  return res.data;
};

// DELETE /api/expenses/:id
export const deleteExpenseApi = async (id) => {
  const res = await api.delete(`/expenses/${id}`);
  return res.data;
};

/* ---------- Mbyllja e periudhes ---------- */

// GET /api/period-close  ->  { months: ["2026-06", ...], items: [...] }
export const getClosedPeriodsApi = async () => {
  const res = await api.get("/period-close");
  return res.data;
};

// POST /api/period-close  { month: "YYYY-MM", snapshot }
export const closePeriodApi = async ({ month, snapshot }) => {
  const res = await api.post("/period-close", { month, snapshot });
  return res.data;
};

// DELETE /api/period-close/:month  (vetem admin)
export const reopenPeriodApi = async (month) => {
  const res = await api.delete(`/period-close/${month}`);
  return res.data;
};