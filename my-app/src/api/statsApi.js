// src/api/statsApi.js
import { api } from "./http.js";

/* =========================
   HELPERS
========================= */
const getBusinessId = () => {
  const businessId = (localStorage.getItem("businessId") || "").trim();
  if (!businessId || businessId === "undefined" || businessId === "null") {
    throw new Error("Mungon businessId. Hyr sërish.");
  }
  return businessId;
};

const withBusinessId = (extraParams = {}) => {
  return { businessId: getBusinessId(), ...extraParams };
};

/* =========================
   STATS
========================= */

// GET /api/stats/period?businessId=...&from=...&to=...
export const getPeriodStats = async (from, to) => {
  const params = withBusinessId({ from, to });
  const res = await api.get("/stats/period", { params });
  return res.data;
};

// GET /api/stats/top-products?businessId=...&from=...&to=...&limit=...
export const getTopProducts = async (from, to, limit = 5) => {
  const params = withBusinessId({ from, to, limit });
  const res = await api.get("/stats/top-products", { params });
  return res.data;
};

// GET /api/stats/waiters?businessId=...&from=...&to=...
export const getWaiterStats = async (from, to) => {
  const params = withBusinessId({ from, to });
  const res = await api.get("/stats/waiters", { params });
  return res.data;
};
