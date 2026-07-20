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
      lowercase: true,
    },

    destination: {
      type: String,
      enum: ["kuzhine", "banak"],
      default: "kuzhine",
      required: true,
      trim: true,
      lowercase: true,
    },

    subCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      default: null,
    },

    subCategory: {
      type: String,
      trim: true,
      default: "",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    nameSq: {
      type: String,
      trim: true,
      default: "",
    },

    nameEn: {
      type: String,
      trim: true,
      default: "",
    },

    nameIt: {
      type: String,
      trim: true,
      default: "",
    },

    descSq: {
      type: String,
      trim: true,
      default: "",
    },

    descEn: {
      type: String,
      trim: true,
      default: "",
    },

    descIt: {
      type: String,
      trim: true,
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    thumbnail: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

ProductSchema.index({ businessId: 1, subCategoryId: 1 });
ProductSchema.index({ businessId: 1, categoryType: 1 });
ProductSchema.index({ businessId: 1 });

export default mongoose.model("Product", ProductSchema);