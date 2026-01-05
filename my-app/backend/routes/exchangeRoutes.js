import express from "express";
import { getExchange, upsertExchange } from "../controllers/exchangeController.js";

const router = express.Router();

// GET /api/exchange?businessId=...&base=EUR&quote=ALL
router.get("/", getExchange);

// PUT /api/exchange  body: { businessId, base, quote, rate }
router.put("/", upsertExchange);

export default router;
