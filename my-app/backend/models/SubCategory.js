import mongoose from "mongoose";

const SubCategorySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    categoryType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true, // ✅ mos krijo "Pije" dhe "pije" si dy kategori
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    // ✅ KU SHKON POROSIA PËR KËTË NËN-KATEGORI
    destination: {
      type: String,
      enum: ["kuzhine", "banak"],
      default: "kuzhine",
      required: true,
      index: true,
      trim: true,
      lowercase: true, // ✅ siguri ekstra
    },
  },
  { timestamps: true }
);

// ✅ unik: e njëjta nën-kategori nuk krijohet 2 herë në të njëjtin business + categoryType
SubCategorySchema.index(
  { businessId: 1, categoryType: 1, name: 1 },
  { unique: true }
);

export default mongoose.model("SubCategory", SubCategorySchema);
