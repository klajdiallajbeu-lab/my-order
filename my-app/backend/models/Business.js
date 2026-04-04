import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    city: { type: String, required: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    orderPin: {
      code: { type: String, default: "" },
      day: { type: String, default: "" },
      enabled: { type: Boolean, default: true },
    },

    settings: {
      baseCurrency: {
        type: String,
        enum: ["ALL", "EUR", "USD", "CHF", "GBP"],
        default: "ALL",
      },

      showCurrencies: {
        type: [String],
        enum: ["ALL", "EUR", "USD", "CHF", "GBP"],
        default: ["ALL", "EUR"],
      },

      eurRate: { type: Number, default: 100, min: 0.0001 },
      eurRateUpdatedAt: { type: Date },

      usdRate: { type: Number, default: 95, min: 0.0001 },
      usdRateUpdatedAt: { type: Date },

      chfRate: { type: Number, default: 105, min: 0.0001 },
      chfRateUpdatedAt: { type: Date },

      gbpRate: { type: Number, default: 118, min: 0.0001 },
      gbpRateUpdatedAt: { type: Date },

      orderAccess: {
        enabled: { type: Boolean, default: false },
        windowStart: { type: String, default: "23:00" },
        windowEnd: { type: String, default: "07:00" },

        applyTo: {
          type: [String],
          enum: ["room", "umbrella"],
          default: ["room", "umbrella"],
        },
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Business", businessSchema);