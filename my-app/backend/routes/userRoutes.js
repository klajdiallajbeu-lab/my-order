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
} from "../controllers/userController.js";

const router = express.Router();

/* =========================
   USERS
========================= */
router.get("/", getUsers);
router.get("/:id", getUserById);

router.post("/", createUser);
router.post("/login", loginUser);

router.put("/:id", updateUser);
router.put("/:id/profile", updateProfile);
router.put("/:id/change-password", changePassword);

router.delete("/:id", deleteUser);

export default router;