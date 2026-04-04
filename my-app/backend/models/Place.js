// models/Place.js
import mongoose from "mongoose";

const placeSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
    type: { type: String, enum: ["room", "umbrella"], required: true },
    code: { type: String, required: true },
    codeNormalized: { type: String, required: true },
    qrToken: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ✅ mos lejo dubla brenda të njëjtit biznes + tip
placeSchema.index({ businessId: 1, type: 1, codeNormalized: 1 }, { unique: true });

export default mongoose.model("Place", placeSchema);
