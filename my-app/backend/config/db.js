import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    // 🔍 Debug (hiqe pasi të rregullohet)
    console.log("🔎 MONGO_URI =", uri);

    if (!uri) {
      throw new Error("MONGO_URI mungon në .env");
    }

    // 🛡️ Siguri: kontrollo skemën
    if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
      throw new Error(
        `MONGO_URI e pavlefshme. Duhet të fillojë me mongodb:// ose mongodb+srv://`
      );
    }

    await mongoose.connect(uri, {
      autoIndex: true,
    });

    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ Mongo Error:", err.message);
    process.exit(1);
  }
};

export default connectDB;
