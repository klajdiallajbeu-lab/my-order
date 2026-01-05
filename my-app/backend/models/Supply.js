import mongoose from "mongoose";

const supplySchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 0,
    },
    // opsionale: cmimi me shumicë, nqs do më vonë analiza finance
    unitPrice: {
      type: Number,
      default: 0,
    },
    note: String,
  },
  { timestamps: true }
);

export default mongoose.model("Supply", supplySchema);
