import express from "express"
import { getTicket,getTickets,createTicket } from "../controllers/ticket.js";
import { authenticate } from "../middleware/auth.js";

const router=express.Router();

router.post("/",authenticate,createTicket)

// router.post("/login",login);
// router.post("/logout",logout);
// router.post("/updateUser",authenticate,updateUser);
router.get("/",authenticate,getTickets);
router.get("/:id",authenticate,getTicket)

export default router;