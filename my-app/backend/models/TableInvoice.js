import mongoose from "mongoose";

const TableInvoiceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },

    tableSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TableSession",
    },

    tableNumber: {
      type: String,
      required: true,
    },

    waiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    items: [
      {
        name: String,
        price: Number,
        qty: { type: Number, default: 1 },
        total: Number,
      },
    ],

    total: {
      type: Number,
      required: true,
      default: 0,
    },

    status: {
      type: String,
      enum: ["printed", "paid"],
      default: "printed",
    },

    closedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("TableInvoice", TableInvoiceSchema);