import mongoose from "mongoose";

const SaleSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  qty: Number,
  time: { type: Date, default: Date.now }
});

export default mongoose.model("Sale", SaleSchema);
