import express from "express"
import { createInterview, debugInterview, getAllInterviews, getInterviewById } from "../controllers/interviewRoutes.js";
import { requireAuth } from "@clerk/express"
import { attachClerkUserId } from "../middleware/clerkAuth.js";

const router=express.Router();

// Create interview
router.post("/", requireAuth(), attachClerkUserId, createInterview);

// Get all interviews for current user
router.get("/", requireAuth(), attachClerkUserId, getAllInterviews);

// Debug endpoint - before /:id
router.get("/debug/:id", requireAuth(), attachClerkUserId,debugInterview);

// Get specific interview by ID - LAST
router.get("/:id", requireAuth(), attachClerkUserId, getInterviewById);

export default router;