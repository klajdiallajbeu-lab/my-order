import mongoose from "mongoose";

const TableSessionSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
    index: true,
  },

  tableNumber: {
    type: String, // "1", "2", "A1"
    required: true,
  },

  status: {
    type: String,
    enum: ["open", "done"],
    default: "open",
  },

  items: [
    {
      name: String,
      price: Number,
      qty: { type: Number, default: 1 },
    },
  ],

  total: {
    type: Number,
    default: 0,
  },

  waiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("TableSession", TableSessionSchema);