import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    clerkUserId: {
      type: String,
      unique: true,
      sparse: true, // Allow null during migration
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: false, // Optional for Clerk users
      minlength: 6,
      select: false,
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
  { timestamps: true }
);

const User= mongoose.model("User", userSchema);

export default User;
