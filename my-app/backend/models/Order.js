import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      index: true,
      required: function () {
        return this.$isNew;
      },
    },

    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, default: 0, min: 0 },
    qty: { type: Number, required: true, default: 1, min: 0.01 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    sourceType: {
      type: String,
      enum: ["tavoline", "dhoma", "cadra"],
      required: true,
      trim: true,
      index: true,
    },

    sourceNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    destination: {
      type: String,
      enum: ["kuzhine", "banak"],
      default: "kuzhine",
      required: true,
      trim: true,
      index: true,
    },

    batchId: {
      type: String,
      default: "",
      index: true,
    },

    items: {
      type: [OrderItemSchema],
      default: [],
    },

    total: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalALL: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      enum: ["ALL", "EUR", "USD", "CHF", "GBP"],
      default: "ALL",
      trim: true,
    },

    exchangeRateUsed: {
      type: Number,
      default: 1,
      min: 0.0001,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "done", "cancelled"],
      default: "pending",
      index: true,
    },

    createdBy: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    waiterId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    acceptedBy: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    acceptedByName: {
      type: String,
      default: "",
      trim: true,
    },

    shiftClosed: {
      type: Boolean,
      default: false,
      index: true,
    },

    shiftClosedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

OrderSchema.index({ businessId: 1, createdAt: -1 });
OrderSchema.index({ businessId: 1, "items.productId": 1, createdAt: -1 });
OrderSchema.index({ businessId: 1, createdBy: 1, createdAt: -1 });
OrderSchema.index({ businessId: 1, createdBy: 1, shiftClosed: 1, createdAt: -1 });
OrderSchema.index({ businessId: 1, waiterId: 1, shiftClosed: 1, createdAt: -1 });
OrderSchema.index({ businessId: 1, acceptedBy: 1, shiftClosed: 1, createdAt: -1 });

// Fshin automatikisht faturat/orders pas 30 ditësh
OrderSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 }
);

OrderSchema.pre("save", function (next) {
  if (Array.isArray(this.items)) {
    const totalAllCalc = this.items.reduce((sum, it) => {
      const price = Number(it?.price || 0);
      const qty = Number(it?.qty ?? 1);

      const p = Number.isFinite(price) ? price : 0;
      const q = Number.isFinite(qty) && qty > 0 ? qty : 1;

      return sum + p * q;
    }, 0);

    this.totalALL = totalAllCalc;

    if (!this.currency || this.currency === "ALL") {
      this.total = totalAllCalc;
      this.exchangeRateUsed = 1;
    } else if (!Number.isFinite(Number(this.total)) || Number(this.total) < 0) {
      this.total = totalAllCalc;
    }
  }

  next();
});

export default mongoose.model("Order", OrderSchema);