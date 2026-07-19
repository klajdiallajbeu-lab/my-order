import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = (
      sessionStorage.getItem("token") ||
      localStorage.getItem("token") ||
      ""
    ).trim();

    const guestSessionToken = (
      sessionStorage.getItem("guestSessionToken") || ""
    ).trim();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (guestSessionToken) {
      config.headers["x-guest-session"] = guestSessionToken;
    }

    console.log(
      "➡️",
      (config.method || "GET").toUpperCase(),
      `${config.baseURL || ""}${config.url || ""}`,
      token ? "TOKEN=ON" : "TOKEN=OFF",
      guestSessionToken ? "GUEST=ON" : "GUEST=OFF"
    );

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

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