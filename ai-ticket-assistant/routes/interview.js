import express from "express"
import { createInterview, getAllInterviews, getInterviewById } from "../controllers/interviewRoutes.js";
import { authenticate } from "../middleware/auth.js";

const router=express.Router();

router.post("/",authenticate,createInterview)
router.get("/",authenticate,getAllInterviews)
router.get("/:id",authenticate,getInterviewById)


export default router;