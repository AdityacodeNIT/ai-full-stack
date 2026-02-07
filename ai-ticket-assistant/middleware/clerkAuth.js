import { getAuth } from "@clerk/express";

/**
 * Middleware to extract Clerk userId and attach to req
 * Use after requireAuth() to ensure user is authenticated
 */
export const attachClerkUserId = (req, res, next) => {
  const { userId } = getAuth(req);
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized - No Clerk user ID" });
  }
  
  req.clerkUserId = userId;
  next();
};
