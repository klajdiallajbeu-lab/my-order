// src/api/ordersApi.js
import { api } from "./http.js";

/* =========================
   HELPERS
========================= */

const getBusinessId = () => {
  const id = (localStorage.getItem("businessId") || "").trim();
  if (!id) throw new Error("Mungon businessId. Hyr sërish.");
  return id;
};

/* =========================
   ORDERS
========================= */

// GET /api/orders
export const getOrders = (params = {}) => {
  return api.get("/orders", { params });
};

// GET /api/orders?businessId=...&from=...&to=...
export const getOrdersByDate = (from, to) => {
  const businessId = getBusinessId();

  return api.get("/orders", {
    params: { businessId, from, to },
  });
};

// GET /api/orders/:id
export const getOrderById = (id) => {
  if (!id) throw new Error("Mungon id porosie.");
  return api.get(`/orders/${id}`);
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

/* =========================
   CLOSE TABLE (FATURA TOTALE)
========================= */

// POST /api/orders/close-table
export const closeTableApi = ({ sourceType, sourceNumber }) => {
  const businessId = getBusinessId();

  return api.post("/orders/close-table", {
    businessId,
    sourceType,
    sourceNumber,
  });
};
export const closeWaiterShiftApi = ({ businessId, waiterName }) => {
  return api.post("/orders/close-waiter-shift", {
    businessId,
    waiterName,
  });
};
export const getWaiterShiftPreviewApi = ({ businessId, waiterName }) => {
  return api.post("/orders/waiter-shift-preview", {
    businessId,
    waiterName,
  });
};