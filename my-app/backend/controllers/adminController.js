import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import Business from "../models/Business.js";
import User from "../models/User.js";

/* ===========================
   ADMIN LOGIN
=========================== */
export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username dhe password janë të detyrueshme" });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(404).json({ message: "Admin nuk u gjet" });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(400).json({ message: "Password i gabuar" });
    }

    res.json({
      message: "Login successful",
      adminId: admin._id,
    });
  } catch (err) {
    console.error("❌ Gabim te adminLogin:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* ===========================
   CREATE BUSINESS + MANAGER
=========================== */
export const createBusinessAndManager = async (req, res) => {
  try {
    const {
      businessName,
      phone,
      email,
      city,
      startDate,
      endDate,
      managerName,
      managerUsername,
      managerPassword,
    } = req.body;

    // ==== VALIDIME ====
    if (!businessName || !phone || !email || !city || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Plotësoni të gjitha fushat e biznesit!" });
    }

    if (!managerName || !managerUsername || !managerPassword) {
      return res.status(400).json({
        message: "Plotësoni të gjitha të dhënat e menaxherit!",
      });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        message: "Data e skadimit duhet të jetë pas datës së aktivizimit!",
      });
    }

    // ==== KRIJO BIZNESIN ====
    const business = await Business.create({
      name: businessName,
      phone,
      email,
      city,
      startDate,
      endDate,
    });

    // ==== KRIJO MENAXHERIN ====
    const hashedPassword = await bcrypt.hash(managerPassword, 10);

    const manager = await User.create({
      businessId: business._id,
      name: managerName,
      username: managerUsername,
      password: hashedPassword,
      role: "manager",
    });

    // cakto menaxherin si owner
    business.owner = manager._id;
    await business.save();

    res.json({
      message: "Biznesi dhe menaxheri u krijuan me sukses!",
      businessId: business._id,
    });
  } catch (err) {
    console.error("❌ Gabim te createBusinessAndManager:", err);
    res.status(500).json({
      message: "Gabim gjatë krijimit të biznesit",
    });
  }
};

/* ===========================
   LIST ALL BUSINESSES
=========================== */
export const listBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find()
      .populate("owner", "name username")
      .sort({ createdAt: -1 });

    res.json(businesses);
  } catch (err) {
    console.error("❌ Gabim te listBusinesses:", err);
    res.status(500).json({ message: "Gabim gjatë marrjes së bizneseve" });
  }
};

/* ===========================
   DELETE BUSINESS
=========================== */
export const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Mungon ID e biznesit." });
    }

    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ message: "Biznesi nuk u gjet." });
    }

    // fshi userat e lidhur me biznesin
    await User.deleteMany({ businessId: id });

    await Business.findByIdAndDelete(id);

    res.json({ message: "Biznesi u fshi me sukses." });
  } catch (err) {
    console.error("❌ Gabim te deleteBusiness:", err);
    res.status(500).json({
      message: "Gabim serveri gjatë fshirjes së biznesit.",
    });
  }
};

/* ===========================
   ADMIN DASHBOARD STATS ✅
=========================== */
export const getAdminStats = async (req, res) => {
  try {
    const totalBusinesses = await Business.countDocuments();

    const totalManagers = await User.countDocuments({
      role: "manager",
    });

    res.json({
      totalBusinesses,
      totalManagers,
      systemStatus: "active",
    });
  } catch (err) {
    console.error("❌ Gabim te getAdminStats:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};
