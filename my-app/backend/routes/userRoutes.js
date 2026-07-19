import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateProfile,
  changePassword,
  deleteUser,
  loginUser,

  requestPasswordResetCode,
  verifyPasswordResetCode,
  resetForgottenPassword,
} from "../controllers/userController.js";

import { protectUser, requireRole } from "../middleware/protectUser.js";
import { loginLimiter } from "../middleware/loginLimiter.js";

const router = express.Router();

/* =========================
   PUBLIC
========================= */

// Login
router.post("/login", loginLimiter, loginUser);

// Për momentin lihen publik që të mos prishet ManagerPage
router.get("/", getUsers);
router.get("/:id", getUserById);

router.post(
  "/forgot-password/request-code",
  loginLimiter,
  requestPasswordResetCode
);

router.post(
  "/forgot-password/verify-code",
  loginLimiter,
  verifyPasswordResetCode
);

router.post(
  "/forgot-password/reset",
  loginLimiter,
  resetForgottenPassword
);

/* =========================
   PROTECTED (MANAGER / ADMIN)
========================= */

// Krijo user
router.post(
  "/",
  protectUser,
  requireRole("manager", "admin"),
  createUser
);

// Përditëso user
router.put(
  "/:id",
  protectUser,
  requireRole("manager", "admin"),
  updateUser
);

// Përditëso profil
router.put(
  "/:id/profile",
  protectUser,
  requireRole("manager", "admin"),
  updateProfile
);

// Ndrysho password
router.put(
  "/:id/change-password",
  protectUser,
  requireRole("manager", "admin"),
  changePassword
);

// Fshi user
router.delete(
  "/:id",
  protectUser,
  requireRole("manager", "admin"),
  deleteUser
);

export default router;