import express from "express";
import { requireAuth} from "@clerk/express";
import { getCurrentUser, getUser, getWsToken, updateUser } from "../controllers/user.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { attachUserId } from "../middleware/attachUser.js";

const router = express.Router();

router.get("/me", requireAuth(),attachUserId, getCurrentUser);

// Update user (authenticated)

router.post("/updateUser", requireAuth(),attachUserId,  updateUser);

// Get all users (ADMIN ONLY)

router.get("/getusers", requireAuth(),requireAdmin, getUser);

// WEBSOCKET TOKEN ENDPOINT

router.get("/ws-token", requireAuth(), getWsToken);

export default router;
