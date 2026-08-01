import mongoose from "mongoose";

/**
 * Destinacionet e printimit.
 *
 * Një vend i vetëm ku përcaktohen, që të mos shpërndahen nëpër skedarë.
 * Për të shtuar një stacion të ri (skarë, ëmbëlsira, bar i dytë):
 *   1. shtoje këtu
 *   2. shtoje te models/Order.js (DESTINATIONS)
 *   3. shtoje te aplikacioni Electron (main.js + renderer.js)
 */
export const DESTINATIONS = ["kuzhine", "banak", "picerie"];

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

    // Ku printohet ky produkt. Caktohet nga menaxheri për çdo produkt.
    destination: {
      type: String,
      enum: DESTINATIONS,
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