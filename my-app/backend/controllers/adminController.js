import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Admin from "../models/Admin.js";
import Business from "../models/Business.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Place from "../models/Place.js";
import jwt from "jsonwebtoken";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const adminLogin = async (req, res) => {
  try {
    const { username, password, turnstileToken } = req.body;

    if (!process.env.TURNSTILE_SECRET_KEY) {
      console.error("TURNSTILE_SECRET_KEY mungon në .env");
      return res.status(500).json({
        message: "Gabim konfigurimi në server",
      });
    }

    if (!turnstileToken) {
      return res.status(400).json({
        message: "Përfundo kontrollin e sigurisë.",
      });
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
          remoteip: req.ip,
        }),
      }
    );

    const verifyResult = await verifyResponse.json();

    if (!verifyResult.success) {
      console.error("Turnstile verify failed:", verifyResult["error-codes"]);

      return res.status(400).json({
        message: "Kontrolli i sigurisë dështoi. Provo përsëri.",
      });
    }

    const cleanUsername = (username || "").trim();
    const cleanPassword = String(password || "");

    if (!cleanUsername || !cleanPassword) {
      return res.status(400).json({
        message: "Username dhe password janë të detyrueshme",
      });
    }

    const admin = await Admin.findOne({ username: cleanUsername });

    if (!admin) {
      return res.status(401).json({
        message: "Kredencialet janë të pasakta",
      });
    }

    const match = await bcrypt.compare(cleanPassword, admin.password);

    if (!match) {
      return res.status(401).json({
        message: "Kredencialet janë të pasakta",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET mungon në konfigurimin e serverit");
    }

    const token = jwt.sign(
      {
        id: admin._id,
        role: "admin",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.json({
      message: "Login successful",
      adminId: admin._id,
      token,
    });
  } catch (err) {
    console.error("Gabim te adminLogin:", err);

    return res.status(500).json({
      message: "Gabim serveri",
    });
  }
};

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

    const cleanBusinessName = (businessName || "").trim();
    const cleanPhone = (phone || "").trim();
    const cleanEmail = (email || "").trim();
    const cleanCity = (city || "").trim();
    const cleanManagerName = (managerName || "").trim();
    const cleanManagerUsername = (managerUsername || "").trim();
    const cleanManagerPassword = String(managerPassword || "");

    if (
      !cleanBusinessName ||
      !cleanPhone ||
      !cleanEmail ||
      !cleanCity ||
      !startDate ||
      !endDate
    ) {
      return res
        .status(400)
        .json({ message: "Plotësoni të gjitha fushat e biznesit!" });
    }

    if (!cleanManagerName || !cleanManagerUsername || !cleanManagerPassword) {
      return res.status(400).json({
        message: "Plotësoni të gjitha të dhënat e menaxherit!",
      });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        message: "Data e skadimit duhet të jetë pas datës së aktivizimit!",
      });
    }

    const existingManager = await User.findOne({
      username: cleanManagerUsername,
      role: "manager",
    });

    if (existingManager) {
      return res.status(400).json({
        message: "Ky username i menaxherit ekziston tashmë.",
      });
    }

    const business = await Business.create({
      name: cleanBusinessName,
      phone: cleanPhone,
      email: cleanEmail,
      city: cleanCity,
      startDate,
      endDate,

      
      printerKey: `MYORDER-${Date.now().toString().slice(-6)}`,
    });

    const hashedPassword = await bcrypt.hash(cleanManagerPassword, 10);

    const manager = await User.create({
      businessId: business._id,
      name: cleanManagerName,
      username: cleanManagerUsername,
      password: hashedPassword,
      role: "manager",
    });

    business.owner = manager._id;
    await business.save();

    res.status(201).json({
      message: "Biznesi dhe menaxheri u krijuan me sukses!",
      businessId: business._id,
      managerId: manager._id,
    });
  } catch (err) {
    console.error("Gabim te createBusinessAndManager:", err);
    res.status(500).json({ message: "Gabim gjatë krijimit të biznesit" });
  }
};

export const listBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find()
      .populate("owner", "name username")
      .sort({ createdAt: -1 });

    res.json(businesses);
  } catch (err) {
    console.error("Gabim te listBusinesses:", err);
    res.status(500).json({ message: "Gabim gjatë marrjes së bizneseve" });
  }
};

export const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: "ID e biznesit është e pavlefshme." });
    }

    const { name, phone, email, city, nipt, address, password } = req.body;

    const setObj = {};

    if (name !== undefined) setObj.name = String(name).trim();
    if (phone !== undefined) setObj.phone = String(phone).trim();
    if (email !== undefined) setObj.email = String(email).trim();
    if (city !== undefined) setObj.city = String(city).trim();
    if (nipt !== undefined) setObj.nipt = String(nipt).trim();
    if (address !== undefined) setObj.address = String(address).trim();

    const business = await Business.findByIdAndUpdate(
      id,
      { $set: setObj },
      { new: true }
    );

    if (!business) {
      return res.status(404).json({ message: "Biznesi nuk u gjet." });
    }

    // Nëse admini vendos edhe password të ri për menaxherin pronar
    if (password && business.owner) {
      const hashedPassword = await bcrypt.hash(String(password), 10);
      await User.findByIdAndUpdate(business.owner, {
        password: hashedPassword,
      });
    }

    return res.json(business);
  } catch (err) {
    console.error("Gabim te updateBusiness:", err);
    return res.status(500).json({ message: "Gabim gjatë përditësimit të biznesit." });
  }
};

export const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ message: "ID e biznesit është e pavlefshme." });
    }

    const business = await Business.findById(id);

    if (!business) {
      return res.status(404).json({ message: "Biznesi nuk u gjet." });
    }

    await User.deleteMany({ businessId: id });
    await Product.deleteMany({ businessId: id });
    await Order.deleteMany({ businessId: id });

    try {
      await Place.deleteMany({ businessId: id });
    } catch (err) {
      console.error("Gabim te Place.deleteMany:", err);
    }

    await Business.findByIdAndDelete(id);

    res.json({ message: "Biznesi u fshi me sukses." });
  } catch (err) {
    console.error("Gabim te deleteBusiness:", err);
    res.status(500).json({ message: "Gabim serveri gjatë fshirjes." });
  }
};

export const getAdminStats = async (req, res) => {
  try {
    const totalBusinesses = await Business.countDocuments();
    const totalManagers = await User.countDocuments({ role: "manager" });
    const totalOrders = await Order.countDocuments();

    const revenueAgg = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);

    res.json({
      totalBusinesses,
      totalManagers,
      totalOrders,
      totalRevenue: revenueAgg[0]?.totalRevenue || 0,
      systemStatus: "active",
    });
  } catch (err) {
    console.error("Gabim te getAdminStats:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

export const getBusinessUsageStats = async (req, res) => {
  try {
    const businesses = await Business.find()
      .populate("owner", "name username")
      .sort({ createdAt: -1 });

    const stats = await Promise.all(
      businesses.map(async (b) => {
        const ordersCount = await Order.countDocuments({ businessId: b._id });
        const usersCount = await User.countDocuments({ businessId: b._id });
        const productsCount = await Product.countDocuments({ businessId: b._id });

        let placesCount = 0;
        try {
          placesCount = await Place.countDocuments({ businessId: b._id });
        } catch (err) {
          console.error("Gabim te Place.countDocuments:", err);
        }

        const revenueAgg = await Order.aggregate([
          {
            $match: {
              businessId: b._id,
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$total" },
            },
          },
        ]);

        const today = new Date();
        const end = b.endDate ? new Date(b.endDate) : null;

        return {
          businessId: b._id,
          businessName: b.name || "-",
          city: b.city || "-",
          ownerName: b.owner?.name || "-",
          ownerUsername: b.owner?.username || "-",
          startDate: b.startDate || null,
          endDate: b.endDate || null,
          ordersCount,
          usersCount,
          productsCount,
          placesCount,
          totalRevenue: revenueAgg[0]?.totalRevenue || 0,
          status: end && end < today ? "Skaduar" : "Aktiv",
        };
      })
    );

    res.json(stats);
  } catch (err) {
    console.error("Gabim te getBusinessUsageStats:", err);
    res.status(500).json({ message: "Gabim gjatë statistikave" });
  }
};

export const getBusinessUsageHistory = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId || !isValidObjectId(businessId)) {
      return res.status(400).json({ message: "businessId është i pavlefshëm" });
    }

    const historyAgg = await Order.aggregate([
      {
        $match: {
          businessId: new mongoose.Types.ObjectId(businessId),
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          ordersCount: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
    ]);

    const history = historyAgg.map((item) => ({
      label: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
      ordersCount: item.ordersCount || 0,
      totalRevenue: item.totalRevenue || 0,
    }));

    res.json(history);
  } catch (err) {
    console.error("Gabim te getBusinessUsageHistory:", err);
    res.status(500).json({ message: "Gabim gjatë marrjes së historikut" });
  }
};

export const getBusinessPriceRecommendation = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId || !isValidObjectId(businessId)) {
      return res.status(400).json({ message: "businessId është i pavlefshëm" });
    }

    const business = await Business.findById(businessId).populate(
      "owner",
      "name username"
    );

    if (!business) {
      return res.status(404).json({ message: "Biznesi nuk u gjet" });
    }

    const ordersCount = await Order.countDocuments({ businessId });
    const usersCount = await User.countDocuments({ businessId });
    const productsCount = await Product.countDocuments({ businessId });

    let placesCount = 0;
    try {
      placesCount = await Place.countDocuments({ businessId });
    } catch (err) {
      console.error("Gabim te Place.countDocuments:", err);
    }

    const revenueAgg = await Order.aggregate([
      {
        $match: {
          businessId: new mongoose.Types.ObjectId(businessId),
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);

    const totalRevenue = revenueAgg[0]?.totalRevenue || 0;

    let recommendedPrice = 20;
    let tier = "Basic";
    let reason = "Përdorim i ulët";

    if (
      ordersCount > 1000 ||
      usersCount > 3 ||
      productsCount > 120 ||
      placesCount > 80 ||
      totalRevenue > 300000
    ) {
      recommendedPrice = 40;
      tier = "Standard";
      reason = "Përdorim mesatar";
    }

    if (
      ordersCount > 5000 ||
      usersCount > 8 ||
      productsCount > 300 ||
      placesCount > 200 ||
      totalRevenue > 1200000
    ) {
      recommendedPrice = 70;
      tier = "Premium";
      reason = "Përdorim i lartë";
    }

    if (ordersCount > 10000 || totalRevenue > 2500000) {
      recommendedPrice = 100;
      tier = "Enterprise";
      reason = "Ngarkesë shumë e lartë";
    }

    res.json({
      businessId: business._id,
      businessName: business.name || "-",
      ownerName: business.owner?.name || "-",
      ownerUsername: business.owner?.username || "-",
      ordersCount,
      usersCount,
      productsCount,
      placesCount,
      totalRevenue,
      recommendedPrice,
      tier,
      reason,
    });
  } catch (err) {
    console.error("Gabim te getBusinessPriceRecommendation:", err);
    res.status(500).json({ message: "Gabim gjatë rekomandimit të çmimit" });
  }
};