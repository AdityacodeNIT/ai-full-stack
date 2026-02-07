import express from "express"
import User from "../models/user.model.js";
import { clerkClient, getAuth, requireAuth } from "@clerk/express";
import { attachClerkUserId } from "../middleware/clerkAuth.js";

const router = express.Router();

/* ─────────────────────────────
   WebSocket Token Endpoint
───────────────────────────── */
router.get("/ws-token", requireAuth(), async (req, res) => {
  try {
    console.log("🔑 WS token request received");
    
    const auth = getAuth(req);
    console.log("Auth object:", { 
      userId: auth.userId, 
      sessionId: auth.sessionId,
      hasGetToken: typeof auth.getToken === 'function'
    });
    
    const { userId, getToken } = auth;
    
    if (!userId) {
      console.error("❌ No userId in auth");
      return res.status(401).json({ error: "No authenticated user" });
    }

    // Get the session token directly from the request
    const token = await getToken();
    
    if (!token) {
      console.error("❌ No token returned from getToken()");
      return res.status(401).json({ error: "No session token available" });
    }

    console.log("✅ Token generated successfully for user:", userId);
    
    // Return the JWT token
    res.json({ 
      token,
      userId 
    });
  } catch (error) {
    console.error("❌ WS token error:", error);
    res.status(500).json({ 
      error: "Failed to generate WebSocket token",
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/* ─────────────────────────────
   Get Current User Info
───────────────────────────── */
router.get("/me", requireAuth(), attachClerkUserId, async (req, res) => {
  try {
    const { userId } = getAuth(req);
    
    // Get Clerk user data
    const clerkUser = await clerkClient.users.getUser(userId);
    
    // Get MongoDB user data (if exists)
    let dbUser = await User.findOne({ clerkUserId: userId });
    
    // Create user in DB if doesn't exist
    if (!dbUser) {
      dbUser = await User.create({
        clerkUserId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        role: clerkUser.publicMetadata?.role || "user",
        skills: [],
      });
    }
    
    res.json({
      user: {
        id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        role: clerkUser.publicMetadata?.role || dbUser.role,
        skills: dbUser.skills,
      },
      authenticated: true,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

/* ─────────────────────────────
   Update User (ADMIN ONLY)
───────────────────────────── */
export const updateUser = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    // Get logged-in Clerk user
    const clerkUser = await clerkClient.users.getUser(userId);

    // Admin check
    if (clerkUser.publicMetadata?.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }

    let { skills = [], role, email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    // Normalize skills
    skills = skills.map(skill =>
      typeof skill === "string"
        ? { name: skill, proficiency: 1 }
        : skill
    );

    await User.updateOne(
      { email },
      {
        skills: skills.length ? skills : user.skills,
        role: role ?? user.role,
      }
    );

    return res.json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({
      error: "update_failed",
      details: error.message,
    });
  }
};

/* ─────────────────────────────
   Get All Users (ADMIN ONLY)
───────────────────────────── */
export const getUser = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    const clerkUser = await clerkClient.users.getUser(userId);

    if (clerkUser.publicMetadata?.role !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }

    const users = await User.find();

    return res.json(users);
  } catch (error) {
    res.status(500).json({
      error: "users_not_found",
      details: error.message,
    });
  }
};

router.post("/updateUser", requireAuth(), updateUser);
router.get("/getusers", requireAuth(), getUser);

export default router;
