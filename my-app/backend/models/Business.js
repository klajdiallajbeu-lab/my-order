import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    phone: { type: String, required: true },
    email: { type: String, required: true },
    city: { type: String, required: true },

    startDate: { type: Date, required: true }, // data e aktivizimit
    endDate: { type: Date, required: true },   // data e skadimit

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    /* ======================
       SETTINGS – VALUTA
    ====================== */
    settings: {
      // monedha bazë e çmimeve
      baseCurrency: {
        type: String,
        enum: ["ALL", "EUR", "USD"],
        default: "ALL",
      },

      // cilat monedha shfaqen në menu
      showCurrencies: {
        type: [String],
        enum: ["ALL", "EUR", "USD"],
        default: ["ALL", "EUR"],
      },

      // sa ALL = 1 EUR
      eurRate: {
        type: Number,
        default: 100,
        min: 0.0001,
      },
      eurRateUpdatedAt: { type: Date },

      // 🆕 sa ALL = 1 USD
      usdRate: {
        type: Number,
        default: 95,
        min: 0.0001,
      },
      usdRateUpdatedAt: { type: Date },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Business", businessSchema);
