import express from "express";
import { protectUser } from "../middleware/protectUser.js";
import {
  getClosedPeriods,
  closePeriod,
  reopenPeriod,
} from "../controllers/periodCloseController.js";

const router = express.Router();

router.get("/", protectUser, getClosedPeriods);
router.post("/", protectUser, closePeriod);
router.delete("/:month", protectUser, reopenPeriod);

export default router;