// models/PeriodClose.js
// Mbyllja e nje periudhe (muaji). Pasi mbyllet, shpenzimet e asaj periudhe
// nuk mund te shtohen, ndryshohen apo fshihen — vetem lexohen dhe printohen.

import mongoose from "mongoose";

const periodCloseSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    // Formati "YYYY-MM", p.sh. "2026-07"
    month: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },

    // Fotografia e shifrave ne momentin e mbylljes (per verifikim te mevonshem)
    snapshot: {
      revenue: { type: Number, default: 0 },
      expenses: { type: Number, default: 0 },
      profit: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
    },

    closedBy: {
      type: String,
      trim: true,
      default: "",
    },

    closedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Nje mbyllje e vetme per (biznes, muaj)
periodCloseSchema.index({ businessId: 1, month: 1 }, { unique: true });

/**
 * A eshte i mbyllur muaji te cilit i perket kjo date?
 * @param {string|mongoose.Types.ObjectId} businessId
 * @param {Date|string} date
 * @returns {Promise<boolean>}
 */
export async function isMonthClosed(businessId, date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;

  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const found = await PeriodClose.findOne({ businessId, month })
    .select({ _id: 1 })
    .lean();

  return Boolean(found);
}

const PeriodClose = mongoose.model("PeriodClose", periodCloseSchema);

export default PeriodClose;