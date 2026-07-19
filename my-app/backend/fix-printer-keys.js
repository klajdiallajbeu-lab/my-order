import dotenv from "dotenv";
import mongoose from "mongoose";
import Business from "./models/Business.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const businesses = await Business.find({
  $or: [
    { printerKey: { $exists: false } },
    { printerKey: "" },
    { printerKey: null },
  ],
});

for (const b of businesses) {
  b.printerKey = `MYORDER-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
  await b.save();
  console.log(b.name, b.printerKey);
}

await mongoose.disconnect();
console.log("Done");
