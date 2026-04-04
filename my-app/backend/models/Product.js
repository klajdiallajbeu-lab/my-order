import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    categoryType: {
      type: String,
      enum: ["ushqime", "pije", "cadra", "dhoma"],
      required: true,
      trim: true,
    },

    destination: {
      type: String,
      enum: ["kuzhine", "banak"],
      default: "kuzhine",
      required: true,
    },

    subCategory: {
      type: String,
      trim: true,
    },

    // ✅ fallback (përdore për listime të thjeshta)
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // ✅ multi-language names
    nameSq: { type: String, trim: true, default: "" },
    nameEn: { type: String, trim: true, default: "" },
    nameIt: { type: String, trim: true, default: "" },

    // ✅ multi-language descriptions
    descSq: { type: String, trim: true, default: "" },
    descEn: { type: String, trim: true, default: "" },
    descIt: { type: String, trim: true, default: "" },

    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);
