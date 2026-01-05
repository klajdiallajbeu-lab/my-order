import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://192.168.100.71:5000";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,   // ✅ këtu e mban /api
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// 🔍 shiko ku po godet (hiqe më vonë)
api.interceptors.request.use((config) => {
  console.log("➡️", (config.method || "GET").toUpperCase(), config.baseURL + config.url);
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("❌ API ERROR:", err?.response?.status, err?.response?.data || err.message);
    return Promise.reject(err);
  }
);
