// models/Place.js
import mongoose from "mongoose";

const placeSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["room", "umbrella", "table"],
      required: true,
      trim: true,
      lowercase: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
    },

    codeNormalized: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    qrToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isOccupied: {
      type: Boolean,
      default: false,
    },

    occupiedByWaiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Waiter",
      default: null,
    },

    occupiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Mos lejo dubla brenda të njëjtit biznes + tip
placeSchema.index(
  { businessId: 1, type: 1, codeNormalized: 1 },
  { unique: true }
);

ProductSchema.index({ businessId: 1, subCategoryId: 1 });
ProductSchema.index({ businessId: 1, categoryType: 1 });
ProductSchema.index({ businessId: 1 });

export default mongoose.model("Place", placeSchema);