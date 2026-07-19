import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import crypto from "crypto";
import PasswordReset from "../models/PasswordReset.js";
import { sendPasswordResetCode } from "../config/mailer.js";

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
   GET SINGLE USER BY ID
========================= */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Useri nuk u gjet" });
    }

    res.json(user);
  } catch (err) {
    console.error("❌ Gabim te getUserById:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* =========================
   CREATE USER
========================= */
export const createUser = async (req, res) => {
  try {
    const {
      businessId,
      name,
      surname,
      hotelName,
      nipt,
      username,
      password,
      email,
      phone,
      role,
    } = req.body;

    const nameNorm = String(name || "").trim();
    const surnameNorm = String(surname || "").trim();
    const hotelNameNorm = String(hotelName || "").trim();
    const niptNorm = String(nipt || "").trim();
    const usernameNorm = String(username || "").trim();
    const passwordNorm = String(password || "").trim();
    const emailNorm = String(email || "").trim();
    const phoneNorm = String(phone || "").trim();

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
      surname: surnameNorm,
      hotelName: hotelNameNorm,
      nipt: niptNorm,
      username: usernameNorm,
      password: hashedPass,
      email: emailNorm,
      phone: phoneNorm,
      role: role || "waiter",
    });

    await user.save();

    res.json({
      message: "User u krijua me sukses",
      user: {
        id: user._id,
        businessId: user.businessId,
        name: user.name,
        surname: user.surname,
        hotelName: user.hotelName,
        nipt: user.nipt,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Gabim te createUser:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

const normalizeEmail = (value) =>
  String(value || "").trim().toLowerCase();

const normalizePhone = (value) =>
  String(value || "").replace(/[^\d+]/g, "").trim();

const hashResetValue = (value) => {
  const secret = process.env.PASSWORD_RESET_SECRET;

  if (!secret) {
    throw new Error("PASSWORD_RESET_SECRET mungon në .env");
  }

  return crypto
    .createHash("sha256")
    .update(`${String(value)}:${secret}`)
    .digest("hex");
};

const publicResetMessage = {
  message:
    "Nëse të dhënat përputhen me një llogari, kodi do të dërgohet.",
};

/* =========================
   UPDATE USER (GENERIC)
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

    if (updateData.username) {
      updateData.username = String(updateData.username).trim();

      const existing = await User.findOne({
        username: updateData.username,
        _id: { $ne: id },
      });

      if (existing) {
        return res.status(400).json({ message: "Username ekziston!" });
      }
    }

    const updated = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    }).select("-password");

    if (!updated) {
      return res.status(404).json({ message: "Useri nuk u gjet" });
    }

    res.json({
      message: "Useri u përditësua me sukses",
      user: updated,
    });
  } catch (err) {
    console.error("❌ Gabim te updateUser:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* =========================
   UPDATE PROFILE
========================= */
export const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      surname,
      hotelName,
      nipt,
      address,
      email,
      phone,
      username,
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Useri nuk u gjet" });
    }

    const nameNorm = String(name || "").trim();
    const surnameNorm = String(surname || "").trim();
    const hotelNameNorm = String(hotelName || "").trim();
    const niptNorm = String(nipt || "").trim();
    const addressNorm = String(address || "").trim();
    const emailNorm = String(email || "").trim();
    const phoneNorm = String(phone || "").trim();
    const usernameNorm = String(username || "").trim();

    if (!nameNorm || !usernameNorm) {
      return res.status(400).json({
        message: "Emri dhe username janë të detyrueshme",
      });
    }

    const existing = await User.findOne({
      username: usernameNorm,
      _id: { $ne: id },
    });

    if (existing) {
      return res.status(400).json({
        message: "Ky username përdoret nga një user tjetër",
      });
    }

    user.name = nameNorm;
    user.surname = surnameNorm;
    user.hotelName = hotelNameNorm;
    user.nipt = niptNorm;
    user.address = addressNorm;
    user.email = emailNorm;
    user.phone = phoneNorm;
    user.username = usernameNorm;

    await user.save();

    res.json({
      message: "Profili u përditësua me sukses",
      user: {
        id: user._id,
        businessId: user.businessId,
        role: user.role,
        name: user.name,
        surname: user.surname,
        hotelName: user.hotelName,
        nipt: user.nipt,
        address: user.address,
        email: user.email,
        phone: user.phone,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("❌ Gabim te updateProfile:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* =========================
   CHANGE PASSWORD
========================= */
export const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const currentPasswordNorm = String(currentPassword || "").trim();
    const newPasswordNorm = String(newPassword || "").trim();

    if (!currentPasswordNorm || !newPasswordNorm) {
      return res.status(400).json({
        message: "Fjalëkalimi aktual dhe i ri janë të detyrueshme",
      });
    }

    if (newPasswordNorm.length < 8) {
      return res.status(400).json({
        message: "Fjalëkalimi i ri duhet të ketë të paktën 8 karaktere",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Useri nuk u gjet" });
    }

    const isMatch = await bcrypt.compare(currentPasswordNorm, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Fjalëkalimi aktual është i pasaktë",
      });
    }

    const samePassword = await bcrypt.compare(newPasswordNorm, user.password);
    if (samePassword) {
      return res.status(400).json({
        message: "Fjalëkalimi i ri nuk mund të jetë i njëjtë me aktualin",
      });
    }

    user.password = await bcrypt.hash(newPasswordNorm, 10);
    await user.save();

    res.json({ message: "Fjalëkalimi u ndryshua me sukses" });
  } catch (err) {
    console.error("❌ Gabim te changePassword:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* =========================
   DELETE USER
========================= */
export const deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Useri nuk u gjet" });
    }

    res.json({ message: "Useri u fshi" });
  } catch (err) {
    console.error("❌ Gabim te deleteUser:", err);
    res.status(500).json({ message: "Gabim serveri" });
  }
};

/* =========================
   FORGOT PASSWORD - REQUEST CODE
========================= */

export const requestPasswordResetCode = async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim();
    const email = normalizeEmail(req.body?.email);
    const phone = normalizePhone(req.body?.phone);
    const channel = String(req.body?.channel || "email")
      .trim()
      .toLowerCase();

    if (!username || !email || !phone) {
      return res.status(400).json({
        message:
          "Plotëso username, email dhe numrin e telefonit.",
      });
    }

    if (!["email", "sms"].includes(channel)) {
      return res.status(400).json({
        message: "Kanali i verifikimit nuk është i vlefshëm.",
      });
    }

    const user = await User.findOne({
      username,
    });

    /*
      Nuk tregojmë nëse username ekziston ose jo.
    */
    if (!user) {
      return res.json(publicResetMessage);
    }

    const storedEmail = normalizeEmail(user.email);
    const storedPhone = normalizePhone(user.phone);

    if (
      storedEmail !== email ||
      storedPhone !== phone
    ) {
      return res.json(publicResetMessage);
    }

    if (channel === "sms") {
      return res.status(501).json({
        message:
          "Verifikimi me SMS nuk është aktivizuar ende. Përdor emailin.",
      });
    }

    if (!storedEmail) {
      return res.status(400).json({
        message:
          "Kjo llogari nuk ka një email të regjistruar.",
      });
    }

    /*
      Fshijmë kodet e mëparshme të papërdorura.
    */
    await PasswordReset.deleteMany({
      userId: user._id,
      usedAt: null,
    });

    /*
      Kod 6-shifror.
    */
    const code = String(
      crypto.randomInt(100000, 1000000)
    );

    const codeHash = hashResetValue(code);

    await PasswordReset.create({
      userId: user._id,
      channel: "email",
      destination: storedEmail,
      codeHash,
      attempts: 0,
      verified: false,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    await sendPasswordResetCode({
      email: storedEmail,
      code,
      userName: user.name,
    });

    return res.json(publicResetMessage);
  } catch (err) {
    console.error(
      "❌ requestPasswordResetCode:",
      err
    );

    return res.status(500).json({
      message:
        "Kodi nuk mund të dërgohej. Provo përsëri.",
    });
  }
};

/* =========================
   FORGOT PASSWORD - VERIFY CODE
========================= */

export const verifyPasswordResetCode = async (req, res) => {
  try {
    const username = String(
      req.body?.username || ""
    ).trim();

    const code = String(
      req.body?.code || ""
    ).trim();

    if (!username || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        message: "Vendos username dhe kodin 6-shifror.",
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({
        message: "Kodi është i pasaktë ose ka skaduar.",
      });
    }

    const resetRequest = await PasswordReset.findOne({
      userId: user._id,
      usedAt: null,
    }).sort({ createdAt: -1 });

    if (
      !resetRequest ||
      resetRequest.expiresAt.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: "Kodi është i pasaktë ose ka skaduar.",
      });
    }

    if (resetRequest.attempts >= 5) {
      return res.status(429).json({
        message:
          "Ke kaluar numrin e tentativave. Kërko një kod të ri.",
      });
    }

    const receivedHash = hashResetValue(code);

    if (receivedHash !== resetRequest.codeHash) {
      resetRequest.attempts += 1;
      await resetRequest.save();

      return res.status(400).json({
        message: "Kodi është i pasaktë ose ka skaduar.",
      });
    }

    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    resetRequest.verified = true;
    resetRequest.resetTokenHash =
      hashResetValue(resetToken);

    await resetRequest.save();

    return res.json({
      message: "Kodi u verifikua me sukses.",
      resetToken,
    });
  } catch (err) {
    console.error(
      "❌ verifyPasswordResetCode:",
      err
    );

    return res.status(500).json({
      message: "Gabim gjatë verifikimit të kodit.",
    });
  }
};

/* =========================
   FORGOT PASSWORD - RESET
========================= */

export const resetForgottenPassword = async (req, res) => {
  try {
    const username = String(
      req.body?.username || ""
    ).trim();

    const resetToken = String(
      req.body?.resetToken || ""
    ).trim();

    const newPassword = String(
      req.body?.newPassword || ""
    ).trim();

    const confirmPassword = String(
      req.body?.confirmPassword || ""
    ).trim();

    if (
      !username ||
      !resetToken ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message: "Plotëso të gjitha fushat.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message:
          "Fjalëkalimi duhet të ketë të paktën 8 karaktere.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message:
          "Konfirmimi i fjalëkalimit nuk përputhet.",
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({
        message:
          "Kërkesa është e pavlefshme ose ka skaduar.",
      });
    }

    const resetTokenHash =
      hashResetValue(resetToken);

    const resetRequest = await PasswordReset.findOne({
      userId: user._id,
      resetTokenHash,
      verified: true,
      usedAt: null,
    }).sort({ createdAt: -1 });

    if (
      !resetRequest ||
      resetRequest.expiresAt.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message:
          "Kërkesa është e pavlefshme ose ka skaduar.",
      });
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.password
    );

    if (samePassword) {
      return res.status(400).json({
        message:
          "Fjalëkalimi i ri nuk mund të jetë i njëjtë me të vjetrin.",
      });
    }

    user.password = await bcrypt.hash(
      newPassword,
      10
    );

    await user.save();

    resetRequest.usedAt = new Date();
    resetRequest.resetTokenHash = "";
    await resetRequest.save();

    /*
      Fshijmë kërkesat e tjera aktive.
    */
    await PasswordReset.deleteMany({
      userId: user._id,
      _id: { $ne: resetRequest._id },
    });

    return res.json({
      message:
        "Fjalëkalimi u ndryshua me sukses. Tani mund të bësh login.",
    });
  } catch (err) {
    console.error(
      "❌ resetForgottenPassword:",
      err
    );

    return res.status(500).json({
      message:
        "Fjalëkalimi nuk mund të ndryshohej.",
    });
  }
};

/* =========================
   LOGIN USER
========================= */
export const loginUser = async (req, res) => {
  try {
    const usernameNorm = String(req.body?.username || "").trim();
    const passwordNorm = String(req.body?.password || "").trim();
    const turnstileToken = String(
      req.body?.turnstileToken || ""
    ).trim();


    if (!usernameNorm || !passwordNorm) {
      return res.status(400).json({
        message: "Vendos username dhe password",
      });
    }

    if (!turnstileToken) {
      return res.status(400).json({
        message: "Përfundo kontrollin e sigurisë.",
      });
    }

    if (!process.env.TURNSTILE_SECRET_KEY) {
      console.error("TURNSTILE_SECRET_KEY mungon në backend/.env");

      return res.status(500).json({
        message: "Gabim konfigurimi në server.",
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
          remoteip: req.ip || "",
        }),
      }
    );

    const verifyResult = await verifyResponse.json();

    if (!verifyResult.success) {
      console.error("Turnstile manager failed:", {
        errors: verifyResult["error-codes"],
        hostname: verifyResult.hostname,
      });

      return res.status(400).json({
        message: "Kontrolli i sigurisë dështoi. Provo përsëri.",
      });
    }

    const user = await User.findOne({
      username: usernameNorm,
    });

    if (!user) {
      return res.status(401).json({
        message: "Kredencialet janë të pasakta",
      });
    }

    const isMatch = await bcrypt.compare(
      passwordNorm,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Kredencialet janë të pasakta",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET mungon në .env");
    }

    const token = jwt.sign(
      {
        id: user._id,
        businessId: user.businessId,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "12h",
      }
    );

    return res.json({
      token,
      id: user._id,
      businessId: user.businessId,
      role: user.role,
      name: user.name,
      surname: user.surname || "",
      hotelName: user.hotelName || "",
      nipt: user.nipt || "",
      username: user.username,
      email: user.email || "",
      phone: user.phone || "",
    });
  } catch (err) {
    console.error("Gabim te loginUser:", err);

    return res.status(500).json({
      message: "Gabim serveri",
    });
  }
};