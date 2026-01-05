import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
  },

  name: { type: String, required: true },

  username: { type: String, required: true, unique: true },

  password: { type: String, required: true },

  email: { type: String, required: false },

  phone: { type: String, required: false },

  role: { 
    type: String, 
    enum: ["admin", "manager", "waiter"], 
    default: "waiter" 
  }
});

export default mongoose.model("User", UserSchema);

