import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // tavoline / dhoma / cadra
    sourceType: {
      type: String,
      enum: ["tavoline", "dhoma", "cadra"],
      required: true,
      trim: true,
      index: true,
    },

    // numri i tavolines / dhomes / çadres
    sourceNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // ✅ KU SHKON POROSIA
    // kuzhine = ushqime
    // banak   = pije
    destination: {
      type: String,
      enum: ["kuzhine", "banak"],
      default: "kuzhine",
      required: true,
      trim: true,
      index: true,
    },

    // ✅ lidh 2 porosi (për porosi të përziera)
    batchId: {
      type: String,
      default: "",
      index: true,
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          default: undefined, // ✅ më mirë se null
        },
        name: { type: String, required: true, trim: true },
        price: { type: Number, required: true, default: 0, min: 0 },
        qty: { type: Number, required: true, default: 1, min: 1 },
      },
    ],

    total: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ✅ vetëm 1 variant (mos e mbaj edhe completed edhe done)
    status: {
      type: String,
      enum: ["pending", "accepted", "done", "cancelled"],
      default: "pending",
      index: true,
    },

    createdBy: { type: String, default: "", trim: true },
    acceptedBy: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

// ✅ total si “source of truth” në DB
OrderSchema.pre("save", function (next) {
  if (Array.isArray(this.items)) {
    this.total = this.items.reduce(
      (sum, it) => sum + Number(it.price || 0) * Number(it.qty || 1),
      0
    );
  }
  next();
});

export default mongoose.model("Order", OrderSchema);
