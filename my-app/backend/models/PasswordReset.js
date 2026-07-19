import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    channel: {
      type: String,
      enum: ["email", "sms"],
      required: true,
    },

    destination: {
      type: String,
      required: true,
      trim: true,
    },

    codeHash: {
      type: String,
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    resetTokenHash: {
      type: String,
      default: "",
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    usedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
  MongoDB e fshin dokumentin pasi expiresAt kalon.
  Vonesa e vogël e fshirjes nuk është problem sepse kontrollojmë
  expiresAt edhe manualisht në controller.
*/
passwordResetSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model(
  "PasswordReset",
  passwordResetSchema
);