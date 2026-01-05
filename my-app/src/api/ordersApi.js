// src/api/ordersApi.js
import { api } from "./http.js";

/* =========================
   ORDERS
========================= */

// GET /api/orders?businessId=...&sourceType=...&from=...&to=...
export const getOrders = (params = {}) => {
  return api.get("/orders", { params });
};

// GET /api/orders?businessId=...&from=...&to=...
export const getOrdersByDate = (from, to) => {
  const businessId = (localStorage.getItem("businessId") || "").trim();

  if (!businessId) {
    throw new Error("Mungon businessId. Hyr sërish.");
  }

  return api.get("/orders", {
    params: { businessId, from, to },
  });
};

// POST /api/orders
export const createOrder = (data) => {
  return api.post("/orders", data);
};

// PATCH /api/orders/:id/status
export const updateOrderStatus = (id, data) => {
  if (!id) throw new Error("Mungon id porosie.");
  return api.patch(`/orders/${id}/status`, data);
};

// GET /api/orders/:id
export const getOrderById = (id) => {
  if (!id) throw new Error("Mungon id porosie.");
  return api.get(`/orders/${id}`);
};
