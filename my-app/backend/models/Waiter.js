// backend/models/Waiter.js
import mongoose from "mongoose";

const waiterSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Waiter = mongoose.model("Waiter", waiterSchema);
export default Waiter;
