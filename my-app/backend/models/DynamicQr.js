// models/DynamicQr.js
import mongoose from "mongoose";

const dynamicQrSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // Kodi i shkurtër që shkon në URL: /api/qr/:code  (unik global)
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Emër i lexueshëm për menaxherin (opsional), p.sh. "Tavolina 1 - Google Review"
    label: {
      type: String,
      default: "",
      trim: true,
    },

    // Linku ku ridrejtohet skanimi. Bosh = ende i pacaktuar.
    target: {
      type: String,
      default: "",
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    scans: {
      type: Number,
      default: 0,
    },

    lastScanAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("DynamicQr", dynamicQrSchema);