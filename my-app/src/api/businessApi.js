// src/api/businessApi.js
import { api } from "./http.js";


const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://192.168.100.71:5000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

/* =========================
   ADMIN - BUSINESSES
   (Këto përdoren te AdminDashboard)
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
