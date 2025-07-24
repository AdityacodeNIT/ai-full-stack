import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import Interview from "../models/interview.js"; 
import mongoose from "mongoose";// Corrected casing for consistency if needed

export const createInterview = async (req, res) => {
    console.log("request came")
    // Destructure variables from the request body
    const { type, role, level, techstack, amount } = req.body;

    // --- Basic Validation ---
    if (!role || !level || !amount ) { // userId also required now as per schema
        return res.status(400).json({ message: 'Missing required parameters: role, level, amount, or userId.' });
    }

    try {
        // --- Construct the Prompt (cleaned up) ---
        // Removed "Thank you! <3" from the prompt string as it can interfere with JSON parsing.
        const prompt = `Prepare questions for a job interview.
The job role is ${role}.
The job experience level is ${level}.
The tech stack used in the job is: ${techstack || 'not specified'}.
The focus between behavioural and technical questions should lean towards: ${type || 'a balance'}.
The amount of questions required is: ${amount}.

Please return only the questions, without any additional text.
The questions are going to be read by a voice assistant so do not use "/" or "*" or any special characters that would hinder pronunciation.
Return the questions formatted like this:
["Question 1", "Question 2", "Question 3"]`;

        // --- Call the AI Model ---
        const { text } = await generateText({
            model: google('gemini-2.0-flash-001'),
               apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
            prompt: prompt,
        });

        // --- Robust JSON Parsing ---
        let generatedQuestionsArray;
        try {
            generatedQuestionsArray = JSON.parse(text);
            // Basic validation to ensure it's an array of strings as expected
            if (!Array.isArray(generatedQuestionsArray) || !generatedQuestionsArray.every(q => typeof q === 'string')) {
                console.warn("AI did not return a perfect JSON array of strings. Attempting fallback parsing.");
                // Fallback if parsing works but content is not as expected
                generatedQuestionsArray = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            }
        } catch (parseError) {
            console.error("Error parsing LLM response as JSON. Falling back to line-by-line parsing. Raw text:", text, "Error:", parseError);
            // More aggressive fallback: split by newline and filter empty lines
            generatedQuestionsArray = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        }

        // Ensure we always have an array, even if empty or single element
        if (!Array.isArray(generatedQuestionsArray)) {
            generatedQuestionsArray = [generatedQuestionsArray]; // Wrap in array if single item
        }


        // --- Create Interview Document ---
        const interview = await Interview.create({
            role: role,
            type: type, // Matches schema field name for focus type
            level: level,
            techstack: techstack ? techstack.split(',').map(s => s.trim()) : [], // Split and trim tech stack, handle empty
            questions: generatedQuestionsArray, // Matches schema field name
            numberOfQuestions: amount, // New field in schema
            userId: req.user?._id,
            finalized: true // As per your original code
            // Other fields from comprehensive schema can be added here as needed
        });
        console.log(interview)

        // --- Send Success Response (Corrected Syntax) ---
        return res.status(200).json({
            success: true,
            message: 'Interview questions generated and saved successfully!',
            interviewId: interview._id,
            interview: interview // Optionally send the created interview document back
        });

    } catch (error) {
        // --- Error Handling (Sends Response) ---
        console.error('Error in createInterview:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create interview or generate questions.',
            error: error.message,
            details: error.response?.data || error // More detailed error info
        });
    }
};

export const getInterview=async(req,res)=>{
    res.json({success:true,data:"thank you"})
}