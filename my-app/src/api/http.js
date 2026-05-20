import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
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
    // 👨‍🍳 WAITER ID (PANELI I KAMARJERIT)
    const waiterId =
  (sessionStorage.getItem("waiterId") ||
    localStorage.getItem("waiterId") ||
    "").trim();

    if (waiterId) {
      config.headers["x-waiter-id"] = waiterId;
    }

    // 👤 GUEST SESSION (QR)
    const guestSessionToken =
      (sessionStorage.getItem("guestSessionToken") || "").trim();

    if (guestSessionToken) {
      config.headers["x-guest-session"] = guestSessionToken;
    }

    // 🧭 DEBUG
    console.log(
      "➡️",
      (config.method || "GET").toUpperCase(),
      config.baseURL + config.url,
      waiterId ? "WAITER=ON" : "WAITER=OFF",
      guestSessionToken ? "GUEST=ON" : "GUEST=OFF"
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