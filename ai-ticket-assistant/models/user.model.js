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
        proficiency: { type: Number, min: 1, max: 100, default: 1 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
