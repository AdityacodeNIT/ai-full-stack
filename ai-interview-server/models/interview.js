import mongoose, { Schema } from "mongoose";

const interviewSchema = new Schema(
  {
    role: {
      type: String,
      required: true,
    },
    type: {

      type: String,
      enum: ["technical", "behavioural", "balanced"], 
      default: "a balance",
    },
    level: {
      type: String,
      enum: ["Junior", "Mid-level", "Senior", "Lead", "Executive"],
      required: true,
    },
    techstack: {
      type: [String], 
      default: [],
    },

    numberOfQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["created", "in-progress", "completed", "failed"],
      default: "created",
    },

    responses: [
      {
        question: String,
        response: String,
        analysis: Object, 
      },
    ],
    finalReport: {
      type: Object, 
      default: null,
    },
    proctoringViolations: [
      {
        type: {
          type: String,
          required: true
        },
        detector: {
          type: String, // FaceDetector, ObjectDetector, etc.
        },
        timestamp: {
          type: Number,
          required: true
        },
        questionNumber: Number,
        metadata: {
          type: Object, // Stores confidence, object name, bbox, etc.
          default: {}
        },
        silent: {
          type: Boolean, // If true, user was not notified
          default: true
        }
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

const Interview = mongoose.model("Interview", interviewSchema);
export default Interview;
