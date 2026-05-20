import express from "express";
import { sendBusinessRequest } from "../controllers/businessRequestController.js";

const router = express.Router();

router.post("/", sendBusinessRequest);

export default router;