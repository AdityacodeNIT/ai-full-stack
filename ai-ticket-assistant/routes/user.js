import express from "express";
import { requireAuth, clerkClient, getAuth } from "@clerk/express";
import { getUser, updateUser } from "../controllers/user.js";

const router = express.Router();

/**
 * GET current logged-in user
 * Replacement for old `/me`
 */
router.get("/me", requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);

    const user = await clerkClient.users.getUser(userId);

    res.json({
      clerkUserId: user.id,
      email: user.emailAddresses[0].emailAddress,
      role: user.publicMetadata?.role || "user",
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

/**
 * Update user (authenticated)
 */
router.post("/updateUser", requireAuth(), async (req, res, next) => {
  req.clerkUserId = getAuth(req).userId;
  next();
}, updateUser);

/**
 * Get all users (ADMIN ONLY)
 */
router.get("/getusers", requireAuth(), async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const user = await clerkClient.users.getUser(userId);

    if (user.publicMetadata?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: "Authorization failed" });
  }
}, getUser);

/**
 * WebSocket token (Clerk session token)
 */
router.get("/ws-token", requireAuth(), async (req, res) => {
  try {
    console.log("🔑 WS token endpoint hit");
    
    const auth = getAuth(req);
    console.log("Auth data:", {
      userId: auth.userId,
      sessionId: auth.sessionId,
      hasGetToken: typeof auth.getToken === 'function'
    });

    if (!auth.userId) {
      console.error("❌ No userId in auth");
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!auth.sessionId) {
      console.error("❌ No sessionId in auth");
      return res.status(401).json({ message: "No active session" });
    }

    // Method 1: Try using getToken from auth
    if (typeof auth.getToken === 'function') {
      try {
        const token = await auth.getToken();
        console.log("✅ Token from getToken():", token ? "exists" : "null");
        if (token) {
          return res.json({ token, userId: auth.userId });
        }
      } catch (err) {
        console.error("❌ getToken() failed:", err.message);
      }
    }

    // Method 2: Try getting session and extracting token
    try {
      const session = await clerkClient.sessions.getSession(auth.sessionId);
      console.log("Session data:", {
        id: session.id,
        status: session.status,
        hasLastActiveToken: !!session.lastActiveToken
      });

      if (session.lastActiveToken?.jwt) {
        console.log("✅ Token from session.lastActiveToken.jwt");
        return res.json({ 
          token: session.lastActiveToken.jwt,
          userId: auth.userId 
        });
      }
    } catch (err) {
      console.error("❌ Failed to get session:", err.message);
    }

    // Method 3: Try getToken with template
    try {
      const token = await clerkClient.sessions.getToken(auth.sessionId, "default");
      console.log("✅ Token from getToken(sessionId):", token ? "exists" : "null");
      if (token) {
        return res.json({ token, userId: auth.userId });
      }
    } catch (err) {
      console.error("❌ getToken(sessionId) failed:", err.message);
    }

    console.error("❌ All token methods failed");
    res.status(500).json({ 
      message: "Failed to generate WS token",
      details: "All token retrieval methods failed"
    });
  } catch (err) {
    console.error("❌ WS token error:", err);
    res.status(500).json({ 
      message: "Failed to generate WS token",
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

export default router;
