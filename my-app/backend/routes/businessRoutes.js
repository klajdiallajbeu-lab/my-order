// routes/businessRoutes.js
import express from "express";
import {
  getBusinessById,
  getBusinessSettings,
  updateBusinessSettings,
} from "../controllers/businessController.js";

const router = express.Router();

// (opsionale) mer biznesin komplet
router.get("/:id", getBusinessById);

// ✅ kjo i duhet faqes së kembimit valutor (GET settings)
router.get("/:id/settings", getBusinessSettings);

// ✅ ruaj settings
router.patch("/:id/settings", updateBusinessSettings);

export default router;
