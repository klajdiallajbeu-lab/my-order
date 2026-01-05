import User from "../models/User.js";
import bcrypt from "bcrypt";

/* =========================
   GET USERS
========================= */
export const getUsers = async (req, res) => {
  try {
    const { businessId } = req.query;

    const filter = {};
    if (businessId) filter.businessId = businessId;

    const users = await User.find(filter).select("-password");
    res.json(users);
  } catch (err) {
    console.error("❌ Gabim te getUsers:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* =========================
   CREATE USER (opsional)
========================= */
export const createUser = async (req, res) => {
  try {
    const {
      businessId,
      name,
      username,
      password,
      email,
      phone,
      role,
    } = req.body;

    const nameNorm = String(name || "").trim();
    const usernameNorm = String(username || "").trim();
    const passwordNorm = String(password || "").trim();

    if (!nameNorm || !usernameNorm || !passwordNorm) {
      return res.status(400).json({
        message: "name, username dhe password janë të detyrueshme",
      });
    }

    const exists = await User.findOne({ username: usernameNorm });
    if (exists) {
      return res.status(400).json({ message: "Username ekziston!" });
    }

    const hashedPass = await bcrypt.hash(passwordNorm, 10);

    const user = new User({
      businessId: businessId || null,
      name: nameNorm,
      username: usernameNorm,
      password: hashedPass,
      email,
      phone,
      role: role || "waiter",
    });

    await user.save();
    res.json({ message: "User u krijua me sukses" });
  } catch (err) {
    console.error("❌ Gabim te createUser:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* =========================
   UPDATE USER
========================= */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.password) {
      updateData.password = await bcrypt.hash(
        String(updateData.password).trim(),
        10
      );
    }

    await User.findByIdAndUpdate(id, updateData);
    res.json({ message: "Useri u përditësua me sukses" });
  } catch (err) {
    console.error("❌ Gabim te updateUser:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* =========================
   DELETE USER
========================= */
export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Useri u fshi" });
  } catch (err) {
    console.error("❌ Gabim te deleteUser:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* =========================
   LOGIN USER (KRITIKE)
========================= */
export const loginUser = async (req, res) => {
  try {
    const usernameNorm = String(req.body.username || "").trim();
    const passwordNorm = String(req.body.password || "").trim();

    if (!usernameNorm || !passwordNorm) {
      return res
        .status(400)
        .json({ message: "Vendos username dhe password" });
    }

    // 🔍 DEBUG (hiqe më vonë në prodhim)
    console.log("LOGIN TRY:", usernameNorm);

    const user = await User.findOne({ username: usernameNorm });

    if (!user) {
      console.log("❌ USER NOT FOUND");
      return res
        .status(401)
        .json({ message: "Kredencialet janë të pasakta" });
    }

    const isMatch = await bcrypt.compare(passwordNorm, user.password);

    console.log("🔐 PASSWORD MATCH:", isMatch);

    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Kredencialet janë të pasakta" });
    }

    // ✅ LOGIN OK
    res.json({
      id: user._id,
      businessId: user.businessId,
      role: user.role,
      name: user.name,
      username: user.username,
    });
  } catch (err) {
    console.error("❌ Gabim te loginUser:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};
