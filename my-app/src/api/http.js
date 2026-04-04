// src/api/http.js
import axios from "axios";

export const api = axios.create({
  baseURL: "/api",            // 🔥 Vite proxy → backend
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/* =========================
   REQUEST INTERCEPTOR
========================= */
api.interceptors.request.use(
  (config) => {
    // 🔐 PIN për porosi nga klienti (QR)
    const pin = (localStorage.getItem("orderPin") || "")
      .trim()
      .toUpperCase();

    if (pin) {
      config.headers["x-order-pin"] = pin;
    }

    // 🧭 Debug (hiqe në prodhim)
    console.log(
      "➡️",
      (config.method || "GET").toUpperCase(),
      config.baseURL + config.url,
      pin ? "PIN=ON" : "PIN=OFF"
    );

    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================
   RESPONSE INTERCEPTOR
========================= */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // 🔒 PIN i munguar / i gabuar
    if (status === 401 || status === 403) {
      console.warn("🔐 Access denied:", error?.response?.data?.message);
    }

    console.error(
      "❌ API ERROR:",
      status,
      error?.response?.data || error.message
    );

    return Promise.reject(error);
  }
);
