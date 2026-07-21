// models/Counter.js
// Counter atomik për numra sekuencialë (p.sh. invoiceNumber) për çdo biznes.
// findOneAndUpdate me $inc është operacion atomik në MongoDB — nuk ka race condition.

import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true, // p.sh. "invoice"
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Një counter unik për (biznes, emër)
counterSchema.index({ businessId: 1, name: 1 }, { unique: true });

/**
 * Merr numrin e radhës në mënyrë atomike.
 * Përdorimi: const invoiceNumber = await getNextSequence(businessId, "invoice");
 */
export async function getNextSequence(businessId, name) {
  const counter = await Counter.findOneAndUpdate(
    { businessId, name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  return counter.seq;
}

const Counter = mongoose.model("Counter", counterSchema);

export default Counter;