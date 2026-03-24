import { clerkClient, getAuth } from "@clerk/express";
import ApiError from "../utils/apiError.js";

export const requireAdmin = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);
    const user = await clerkClient.users.getUser(userId);
    if (user.publicMetadata?.role !== "admin") {
      throw new ApiError(403, "UNAUTHRIZED Requests");
    }
    next();
  } catch (error) {
    next(error);
  }
};
