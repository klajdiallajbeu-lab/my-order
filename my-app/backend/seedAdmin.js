// backend/seedAdmin.js
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import connectDB from "./config/db.js";
import Admin from "./models/Admin.js";

dotenv.config();

const run = async () => {
  try {
    await connectDB();

    const username = "admin";
    const plainPassword = "admin123";

    // fshi çdo admin ekzistues me këtë username
    await Admin.deleteOne({ username });

    const hashed = await bcrypt.hash(plainPassword, 10);

    const admin = await Admin.create({
      username,
      password: hashed,
    });

    console.log("✅ Admin u krijua me sukses:");
    console.log("   username:", username);
    console.log("   password:", plainPassword);
    console.log("   _id:", admin._id.toString());

    process.exit(0);
  } catch (err) {
    console.error("❌ Gabim te seedAdmin.js:", err);
    process.exit(1);
  }
};

run();
