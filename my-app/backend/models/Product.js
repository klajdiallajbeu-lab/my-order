import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    // Biznesi që e zotëron këtë produkt
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    // p.sh. "ushqime", "pije", "cadra", "dhoma"
    categoryType: {
      type: String,
      enum: ["ushqime", "pije", "cadra", "dhoma"],
      required: true,
      trim: true,
    },

    // ✅ ku shkon produkti (për ndarje automatike porosish)
    // - ushqimet zakonisht: kuzhine
    // - pijet zakonisht: banak
    destination: {
      type: String,
      enum: ["kuzhine", "banak"],
      default: "kuzhine",
      required: true,
    },

    // p.sh. "Pizza", "Hamburgera", "Numrat", "Dhoma Dopio"
    subCategory: {
      type: String,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", ProductSchema);
