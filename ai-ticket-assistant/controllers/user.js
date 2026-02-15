import express from "express"
import User from "../models/user.model.js";
import { clerkClient, getAuth, requireAuth } from "@clerk/express";
import ApiError from "../utils/apiError.js";
import { logger } from "../utils/logger.js";


export const getWsToken = async (req, res, next) => {
  try {
    logger.log(" WS token endpoint hit");

    const auth = getAuth(req);
    const { userId, sessionId, getToken } = auth;

    if (!userId) {
      throw new ApiError(401, "Not authenticated");
    }

    if (!sessionId) {
      throw new ApiError(401, "No active session");
    }

    // Method 1
    if (typeof getToken === "function") {
      const token = await getToken();
      if (token) {
        return res.json({
          success: true,
          token,
          userId,
        });
      }
    }

    // Method 2
    const session = await clerkClient.sessions.getSession(sessionId);
    if (session?.lastActiveToken?.jwt) {
      return res.json({
        success: true,
        token: session.lastActiveToken.jwt,
        userId,
      });
    }

    // Method 3
    const token = await clerkClient.sessions.getToken(sessionId, "default");
    if (token) {
      return res.json({
        success: true,
        token,
        userId,
      });
    }

    throw new ApiError(500, "Failed to generate WebSocket token");

  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
   const userId = req.clerkUserId;
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const clerkUser = await clerkClient.users.getUser(userId);

    let dbUser = await User.findOne({ clerkUserId: userId });

    if (!dbUser) {
      logger.log(" New user detected, creating in MongoDB...");

      const userCount = await User.countDocuments();
      const role = userCount === 0 ? "admin" : "user";

      await clerkClient.users.updateUser(userId, {
        publicMetadata: { role }
      });

      dbUser = await User.create({
        clerkUserId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        role
      });

      logger.log(`User created: ${dbUser.email} with role: ${role}`);
    }

    res.json({
      success: true,
      data: {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        role: clerkUser.publicMetadata?.role || dbUser.role,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
      }
    });

  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res) => {
  try {

    let { skills = [], role, email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    // normalize skills 
    
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

  }
  
  catch (error) {
    res.status(500).json({
      error: "update_failed",
      details: error.message,
    });

  }
};

export const getUser = async (req, res, next) => {
  try {
    const users = await User.find();

    if (!users || users.length === 0) {
      throw new ApiError(404, "Users not found");
    }

    res.json({
      success: true,
      data: users,
    });

  } catch (error) {
    next(error);
  }
};


