import mongoose, { Schema } from "mongoose";

const interviewSchema = new Schema(
  {
    role: {
      type: String,
      required: true,
    },
    type: {
      // This corresponds to 'questionFocusType' from earlier discussion
      type: String,
      enum: ["technical", "behavioural", "balanced"], // Good to have enum for consistency
      default: "a balance",
    },
    level: {
      type: String,
      enum: ["Junior", "Mid-level", "Senior", "Lead", "Executive"], // Add enum for consistency
      required: true,
    },
    techstack: {
      // <-- ADDED: To store the tech stack
      type: [String], // Store as an array of strings
      default: [],
    },

    numberOfQuestions: {
      // <-- ADDED: To store the 'amount'
      type: Number,
      required: true,
      min: 1,
    },
    userId: {
      // Assuming this is the user who initiated/created the interview
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true, // If every interview must be tied to a user
      default: null, // You can remove default:null if required:true
    },
    status: {
      type: String,
      enum: ["created", "in-progress", "completed"],
      default: "created",
    },

    responses: [
      {
        question: String,
        response: String,
        analysis: Object, // Stores the JSON from analyzeResponse
      },
    ],
    finalReport: {
      type: Object, // Stores the JSON from summarizeOverallFeedback
      default: null,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const Interview = mongoose.model("Interview", interviewSchema);
export default Interview;
