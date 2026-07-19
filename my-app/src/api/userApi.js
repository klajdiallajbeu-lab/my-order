// src/api/userApi.js
import { api } from "./http.js";

/* =========================
   LOGIN
========================= */
export const loginUserApi = async (
  username,
  password,
  turnstileToken
) => {


  const res = await api.post("/users/login", {
    username: (username || "").trim(),
    password: (password || "").trim(),
    turnstileToken: String(turnstileToken || "").trim(),
  });

  return res.data;
};

/* =========================
   GET USER BY ID
========================= */
export const getUserByIdApi = async (id) => {
  const res = await api.get(`/users/${id}`);
  return res.data;
};

/* =========================
   UPDATE PROFILE
========================= */
export const updateProfileApi = async (id, data = {}) => {
  const payload = {
    name: data.name || "",
    surname: data.surname || "",
    hotelName: data.hotelName || "",
    nipt: data.nipt || "",
    address: data.address || "",
    email: data.email || "",
    phone: data.phone || "",
    username: data.username || "",
  };

  const res = await api.put(`/users/${id}/profile`, payload);
  return res.data;
};

/* =========================
   CHANGE PASSWORD
========================= */
export const changePasswordApi = async (id, data) => {
  const res = await api.put(`/users/${id}/change-password`, data);
  return res.data;
};