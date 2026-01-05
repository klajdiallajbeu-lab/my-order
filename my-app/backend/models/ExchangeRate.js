import mongoose from "mongoose";

const exchangeRateSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    base: { type: String, default: "EUR" },
    quote: { type: String, default: "ALL" },
    rate: { type: Number, required: true }, // p.sh. 103.5
  },
  { timestamps: true }
);

exchangeRateSchema.index({ businessId: 1, base: 1, quote: 1 }, { unique: true });

export default mongoose.model("ExchangeRate", exchangeRateSchema);
