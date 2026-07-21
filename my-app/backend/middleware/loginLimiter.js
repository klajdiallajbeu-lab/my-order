import rateLimit from "express-rate-limit";

// Burimi i VETËM i rate limiting-ut për login (users + waiters + forgot-password).
// Aplikohet në nivel route te userRoutes.js dhe waiterRoutes.js.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 20, // 20 tentativa për IP në 15 minuta
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Shumë tentativa login. Provo përsëri pas 15 minutash.",
  },
});