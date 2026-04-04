import mongoose from "mongoose";

const supplySchema = new mongoose.Schema(
  {
    // ✅ konsistente me Business, Order, Product
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // ✅ lidhja reale me produktin
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // ⚠️ opsionale (legacy / UI / reports)
    // mos e bëj required, përndryshe addSupply dështon
    productName: {
      type: String,
      trim: true,
      default: "",
    },

    qty: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Supply", supplySchema);
