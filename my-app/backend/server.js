// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";

import adminRoutes from "./routes/adminRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import waiterRoutes from "./routes/waiterRoutes.js";
import subCategoryRoutes from "./routes/subCategoryRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import exchangeRoutes from "./routes/exchangeRoutes.js";
import businessRoutes from "./routes/businessRoutes.js";
import placesRoutes from "./routes/placesRoutes.js"; // ✅

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const server = http.createServer(app);

app.set("etag", false);

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});
app.set("io", io);

io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("joinBusiness", (businessId) => {
    if (!businessId) return;
    socket.join(`business:${businessId}`);
    console.log("🏢 Joined business room:", businessId);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: true, credentials: true }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

connectDB();

app.use((req, res, next) => {
  console.log("GLOBAL REQ:", {
    method: req.method,
    url: req.originalUrl,
    query: req.query,
  });
  next();
});

/* ROUTES */
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/waiters", waiterRoutes);
app.use("/api/subcategories", subCategoryRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/exchange", exchangeRoutes);
app.use("/api/business", businessRoutes);

app.use("/api/places", placesRoutes); // ✅ FIX

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
