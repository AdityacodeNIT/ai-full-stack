import express from "express"

import { getTicket, getTickets, createTicket, updateTicketStatus } from "../controllers/ticket.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/", authenticate, createTicket);

router.get("/", authenticate, getTickets);
router.get("/:id", authenticate, getTicket);
router.put("/:id/status", authenticate, updateTicketStatus); // New route for updating ticket status

export default router;
