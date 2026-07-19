import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {

    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    city: { type: String, required: true },
    nipt: { type: String, default: "" },
    address: { type: String, default: "" },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    printerKey: {
  type: String,
  unique: true,
  sparse: true,
  trim: true,
  index: true,
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

      kitchenPrinterName: {
        type: String,
        default: "",
        trim: true,
      },

      barPrinterName: {
        type: String,
        default: "",
        trim: true,
      },

      invoicePrinterName: {
        type: String,
        default: "",
        trim: true,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Business", businessSchema);