// src/api/businessApi.js
import { api } from "./http.js";

/* =========================
   ADMIN - BUSINESSES
========================= */

// GET /api/admin/businesses
export const getBusinessesApi = async () => {
  const res = await api.get("/admin/businesses");
  return res.data;
};

// POST /api/admin/businesses
export const createBusinessApi = async (data) => {
  const res = await api.post("/admin/businesses", data);
  return res.data;
};

// PUT /api/admin/businesses/:id
export const updateBusinessApi = async (id, data) => {
  if (!id) throw new Error("Mungon businessId");
  const res = await api.put(`/admin/businesses/${id}`, data);
  return res.data;
};

// DELETE /api/admin/businesses/:id
export const deleteBusinessApi = async (id) => {
  if (!id) throw new Error("Mungon businessId");
  const res = await api.delete(`/admin/businesses/${id}`);
  return res.data;
};

/* =========================
   MANAGER - BUSINESS SETTINGS
========================= */

// GET /api/business/:id/settings
export const getBusinessSettingsApi = async (businessId) => {
  if (!businessId) throw new Error("Mungon businessId");

  const res = await api.get(`/business/${businessId}/settings`);
  return res.data;
};

// PATCH /api/business/:id/settings
export const updateBusinessSettingsApi = async (businessId, data) => {
  if (!businessId) throw new Error("Mungon businessId");

  const res = await api.patch(`/business/${businessId}/settings`, data);
  return res.data;
};