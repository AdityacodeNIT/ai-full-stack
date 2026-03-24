import { getAuth } from "@clerk/express";

export const attachClerkUserId = (req, res, next) => {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized - No Clerk user ID" });
  }

  req.clerkUserId = userId;
  next();
};
