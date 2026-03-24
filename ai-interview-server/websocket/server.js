import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { clerkClient } from "@clerk/express";
import { validateApiKey } from "../utils/validateApiKey.js";
import { InterviewHandler } from "./InterviewHandlers.js";
import { logger } from "../utils/logger.js";

// --- Registry for active handlers ---
const activeHandlers = new Map(); // clerkUserId -> InterviewHandler

export function getHandler(userId) {
  return activeHandlers.get(userId);
}

export function setHandler(userId, handler) {
  activeHandlers.set(userId, handler);
}

export function removeHandler(userId) {
  activeHandlers.delete(userId);
}

// Verify Clerk JWT manually (WS has no middleware)
 
async function authenticateWebSocket(req) {
  const url = new URL(req.url, "http://localhost");
  const token = url.searchParams.get("token");

  if (!token) {
    throw new Error("Missing WebSocket auth token");
  }

  // Decode token (Clerk JWT)
  const decoded = jwt.decode(token);

  if (!decoded?.sub) {
    throw new Error("Invalid Clerk token");
  }

  await clerkClient.users.getUser(decoded.sub);

  return decoded.sub; // clerkUserId
}

export function setupInterviewSocket() {
  if (!validateApiKey()) {
    logger.error(" Missing or invalid AssemblyAI API key. Server shutting down.");
    process.exit(1);
  }

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (ws, req) => {
    try {
      //  Authenticate WS connection
      const clerkUserId = await authenticateWebSocket(req);

      logger.log(" Interview socket connected:", clerkUserId);

      const handler = new InterviewHandler(clerkUserId, ws, req);
      setHandler(clerkUserId, handler);

      // Send a test message immediately to verify connection works
      ws.send(JSON.stringify({ 
        type: "test", 
        message: "Connection established successfully" 
      }));
      logger.log(" Sent test message to client");

      ws.on("message", async (msg) => {
        logger.log("📨 RAW message received:", msg.toString());
        
        let data;
        try {
          data = JSON.parse(msg);
          logger.log("📨 Parsed message:", JSON.stringify(data, null, 2));
        } catch (err) {
          logger.error(" Invalid JSON from client:", err.message);
          return handler.wsGateway.sendError("Invalid JSON format.", true);
        }

        if (!data.type) {
          logger.error(" Message missing type field");
          return handler.wsGateway.sendError("Message type is required.", true);
        }

        try {
          switch (data.type) {
            case "start":
              if (!data.interviewId) {
                logger.error(" Start message missing interviewId");
                return handler.wsGateway.sendError("Interview ID is missing.", true);
              }
              logger.log(" Starting interview:", data.interviewId);
              await handler.startInterview(data.interviewId);
              break;

            case "response":
              if (!data.response) {
                logger.error(" Response message missing response text");
                return handler.wsGateway.sendError("Response is missing.", true);
              }
              logger.log(" Processing response:", data.response.substring(0, 50) + "...");
              await handler.handleResponse(data);
              break;

            case "proctoring_violation":
              if (!data.violationType) {
                logger.error(" Proctoring violation missing type");
                return;
              }
              logger.log(" Proctoring violation:", data.violationType);
              await handler.handleProctoringViolation(data);
              break;

            default:
              logger.warn(" Unknown message type:", data.type);
              handler.wsGateway.sendError("Unknown message type.");
          }
        } catch (err) {
          logger.error(" Error handling message:", err);
          handler.wsGateway.sendError("Internal server error.", false);
        }
      });

      ws.on("close", () => {
        removeHandler(clerkUserId);
        handler.connectionActive = false;
        logger.log(" Interview socket closed:", clerkUserId);
      });

      ws.on("error", (error) => {
        logger.error(" WebSocket error for user", clerkUserId, ":", error.message);
      });

    } catch (err) {
      logger.error(" WebSocket auth failed:", err.message);
      ws.close();
    }
  });

  return wss;
}
