import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
  },

  name: { type: String, required: true },
  surname: { type: String, default: "" },
  hotelName: { type: String, default: "" },
  nipt: { type: String, default: "" },

  // 🔥 SHTO KËTË
  address: { type: String, default: "" },

  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  email: { type: String, required: false, default: "" },
  phone: { type: String, required: false, default: "" },

  role: {
    type: String,
    enum: ["admin", "manager", "waiter"],
    default: "waiter",
  },
});

export default mongoose.model("User", UserSchema);