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
      lowercase: true,
      index: true,
    },

    // ✅ Multi-language
    nameSq: { type: String, required: true, trim: true },
    nameEn: { type: String, default: "", trim: true },
    nameIt: { type: String, default: "", trim: true },

    // ✅ Fallback (për kompatibilitet)
    name: { type: String, required: true, trim: true },

    destination: {
      type: String,
      enum: ["kuzhine", "banak"],
      default: "kuzhine",
      required: true,
      index: true,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: true }
);

// ✅ unik sipas business + type + nameSq (jo name)
SubCategorySchema.index(
  { businessId: 1, categoryType: 1, nameSq: 1 },
  { unique: true }
);

export default mongoose.model("SubCategory", SubCategorySchema);
