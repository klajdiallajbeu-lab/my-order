// models/Expense.js — Shpenzimet e biznesit (fatura: drita, uje, rroga, etj.)
import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = [
  "drita",
  "uje",
  "gaz",
  "qera",
  "rroga",
  "furnizime",
  "siguracione",
  "tjeter",
];

const expenseSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Koment i lire — p.sh. emri i puntorit te rroga, muaji i qerase, etj.
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
    // Data e shpenzimit (jo domosdo dita e regjistrimit)
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdBy: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

expenseSchema.index({ businessId: 1, date: -1 });
expenseSchema.index({ businessId: 1, category: 1, date: -1 });

export default mongoose.model("Expense", expenseSchema);