// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";

import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import printerRoutes from "./routes/printerRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import waiterRoutes from "./routes/waiterRoutes.js";
import subCategoryRoutes from "./routes/subCategoryRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import exchangeRoutes from "./routes/exchangeRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";
import placesRoutes from "./routes/placesRoutes.js";
import businessRequestRoutes from "./routes/businessRequestRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

// Path-e relative te çelësat (jo më /root/... të hardcoduar)
const KEYS_DIR = path.join(__dirname, "keys");
const QZ_CERT_PATH = path.join(KEYS_DIR, "digital-certificate.txt");
const QZ_KEY_PATH = path.join(KEYS_DIR, "private-key.pem");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

app.set("etag", false);

const allowedOrigins = [
  "https://myorderal.com",
  "https://www.myorderal.com",
  "http://localhost:5173",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.set("io", io);

/* =========================
   SOCKET.IO
========================= */

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("joinBusiness", (businessId) => {
    if (!businessId) return;

    const room = `business:${businessId}`;
    socket.join(room);

    console.log("🏢 Joined business room:", room);
  });

  const emitTableInvoice = (payload, eventName) => {
    if (!payload?.businessId) {
      console.log(`⚠️ ${eventName} pa businessId`);
      return;
    }

    const room = `business:${payload.businessId}`;

    console.log(`✅ SERVER MORI ${eventName}:`, payload.businessId);
    console.log(`📤 Po e dërgoj te room: ${room}`);

    io.to(room).emit("table:invoice", payload);
  };

  socket.on("table:invoice", (payload) => {
    emitTableInvoice(payload, "table:invoice");
  });

  socket.on("tableInvoice", (payload) => {
    emitTableInvoice(payload, "tableInvoice");
  });

  socket.on("manager:print-table-invoice", (payload) => {
    emitTableInvoice(payload, "manager:print-table-invoice");
  });

  socket.on("waiter:shift-report", (payload) => {
    if (!payload?.businessId) {
      console.log("⚠️ waiter:shift-report pa businessId");
      return;
    }

    const room = `business:${payload.businessId}`;

    console.log("✅ SERVER MORI waiter:shift-report:", payload.businessId);
    console.log(`📤 Po e dërgoj xhiron te room: ${room}`);

    io.to(room).emit("waiter:shift-report", payload);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

/* =========================
   MIDDLEWARE
========================= */
app.use(
  helmet({
    crossOriginResourcePolicy: false,

    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "https://challenges.cloudflare.com",
          "https://static.cloudflareinsights.com",
          "'unsafe-inline'",
        ],

        scriptSrcAttr: ["'none'"],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
        ],

        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
        ],

        fontSrc: [
          "'self'",
          "data:",
          "https:",
        ],

        connectSrc: [
          "'self'",
          "https://myorderal.com",
          "https://www.myorderal.com",
          "wss://myorderal.com",
          "wss://www.myorderal.com",
          "https://challenges.cloudflare.com",
          "https://cloudflareinsights.com",
          "https://static.cloudflareinsights.com",

          "https://api.frankfurter.dev",
        ],

        frameSrc: [
          "'self'",
          "https://challenges.cloudflare.com",
        ],

        workerSrc: [
          "'self'",
          "blob:",
        ],

        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],

        upgradeInsecureRequests: [],
      },
    },
  })
);


app.use(
  cors({
    origin(origin, callback) {
      // Lejo request pa Origin (Postman, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);



app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Shumë tentativa. Provo përsëri më vonë." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  message: { message: "Shumë kërkesa. Provo përsëri pas pak." },
});

app.use("/api/waiters/login", loginLimiter);
app.use("/api/users/login", loginLimiter);
app.use("/api", apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
  });
});

connectDB();

// Logger global — pa query params (mund të përmbajnë të dhëna sensitive)
app.use((req, res, next) => {
  console.log("GLOBAL REQ:", {
    method: req.method,
    url: req.path,
  });

  next();
});

/* =========================
   QZ TRAY (nënshkrimi i printimit)
========================= */

// Middleware: pranon çdo token JWT valid (manager / waiter / admin).
// Nënshkrimi me çelësin privat nuk duhet të jetë publik.
const requireAnyAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) {
      return res.status(401).json({ message: "Kërkohet autentikim." });
    }

    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Token i pavlefshëm." });
  }
};

// Certifikata është publike nga natyra — mbetet e hapur.
app.get("/api/qz-certificate", (req, res) => {
  try {
    let cert = fs.readFileSync(QZ_CERT_PATH, "utf8");
    cert = cert.replace(/"/g, "").trim();

    res.setHeader("Content-Type", "text/plain");
    res.send(cert);
  } catch (err) {
    console.error("❌ qz-certificate error:", err.message);
    res.status(500).json({ message: "Nuk mund të lexoj certifikatën." });
  }
});

// Nënshkrimi mbrohet me autentikim + validim input-i.
app.post("/api/qz-sign", requireAnyAuth, (req, res) => {
  try {
    const { request } = req.body;

    if (typeof request !== "string" || request.length === 0 || request.length > 10000) {
      return res.status(400).json({ message: "Kërkesë e pavlefshme." });
    }

    const privateKey = fs.readFileSync(QZ_KEY_PATH, "utf8");

    const signer = crypto.createSign("RSA-SHA512");
    signer.update(request);
    signer.end();

    const signature = signer.sign(privateKey, "base64");

    res.json({ signature });
  } catch (err) {
    console.error("❌ qz-sign error:", err.message);
    res.status(500).json({ message: "Nuk mund të nënshkruaj." });
  }
});

/* =========================
   ROUTES
========================= */

app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/printer", printerRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/waiters", waiterRoutes);
app.use("/api/subcategories", subCategoryRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/exchange", exchangeRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/business-request", businessRequestRoutes);
app.use("/api/tables", tableRoutes);
app.use("/downloads", express.static(path.join(__dirname, "public", "downloads")));

/* =========================
   ERRORS
========================= */

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Server error",
  });
});

/* =========================
   START
========================= */

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});