import express from "express"
import { createInterview, getAllInterviews, getInterviewById } from "../controllers/interviewRoutes.js";
import { requireAuth } from "@clerk/express"
import { attachClerkUserId } from "../middleware/clerkAuth.js";
import Interview from "../models/interview.js";

const router=express.Router();

// Create interview
router.post("/", requireAuth(), attachClerkUserId, createInterview);

// Get all interviews for current user
router.get("/", requireAuth(), attachClerkUserId, getAllInterviews);

// Debug endpoint - must come before /:id
router.get("/debug/:id", requireAuth(), attachClerkUserId, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.json({ found: false });
    }
    
    res.json({
      found: true,
      interviewUserId: interview.userId,
      currentUserId: req.clerkUserId,
      match: interview.userId === req.clerkUserId,
      userIdType: typeof interview.userId,
      interview: {
        id: interview._id,
        role: interview.role,
        status: interview.status,
        createdAt: interview.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific interview by ID - must come LAST
router.get("/:id", requireAuth(), attachClerkUserId, getInterviewById);

export default router;