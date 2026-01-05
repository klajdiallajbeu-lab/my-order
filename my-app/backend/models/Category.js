// backend/models/Category.js
import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Category", CategorySchema);
