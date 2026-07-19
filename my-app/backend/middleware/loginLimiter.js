import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 100, // 10 tentativa për IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Shumë tentativa login. Provo përsëri pas 15 minutash.",
  },
});