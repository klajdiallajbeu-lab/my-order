import mongoose from "mongoose";

const guestSessionSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      required: true,
    },
    sourceType: {
      type: String,
      enum: ["dhoma", "cadra", "tavoline"],
      required: true,
    },
    sourceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("GuestSession", guestSessionSchema);