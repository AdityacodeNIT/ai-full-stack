import express from "express"
import { createInterview } from "../controllers/interviewRoutes.js";
import { authenticate } from "../middleware/auth.js";

const router=express.Router();

// router.post("/",authenticate,createInterview)

router.post("/",createInterview)

// router.post("/login",login);
// router.post("/logout",logout);
// router.post("/updateUser",authenticate,updateUser);
// router.get("/",authenticate,);
// router.get("/:id",authenticate,getTicket)

export default router;