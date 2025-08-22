import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      default: "user",
      enum: ["user", "admin", "moderator"],
    },
    skills: [
      {
        name: { type: String },
        level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"] },
        verified: { type: Boolean, default: false }, // <-- verification flag here
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
