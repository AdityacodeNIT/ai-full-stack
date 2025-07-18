import mongoose,{Schema} from "mongoose";

const interviewSchema = new Schema(
    {
        role: {
            type: String,
            required: true // Job role should likely be required
        },
        type: { // This corresponds to 'questionFocusType' from earlier discussion
            type: String,
            enum: ['technical', 'behavioural', 'a balance'], // Good to have enum for consistency
            default: 'a balance'
        },
        level: {
            type: String,
            enum: ['Junior', 'Mid-level', 'Senior', 'Lead', 'Executive'], // Add enum for consistency
            required: true
        },
        techstack: { // <-- ADDED: To store the tech stack
            type: [String], // Store as an array of strings
            default: []
        },
        questions: { // <-- RENAMED from 'question' to 'questions' (plural)
            type: [String],
            required: true // Generated questions are essential
        },
        numberOfQuestions: { // <-- ADDED: To store the 'amount'
            type: Number,
            required: true,
            min: 1
        },
        userId: { // Assuming this is the user who initiated/created the interview
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true, // If every interview must be tied to a user
            default: null // You can remove default:null if required:true
        },
        finalized: {
            type: Boolean,
            default: false
        },
        // You might consider adding fields for candidate responses, overall assessment etc.
        // as per the comprehensive schema we discussed earlier, once you get to that stage.
    },
    {
        timestamps: true // Adds createdAt and updatedAt fields automatically
    }
);

const Interview = mongoose.model("Interview", interviewSchema);
export default Interview;