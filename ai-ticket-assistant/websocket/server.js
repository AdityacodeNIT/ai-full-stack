import { WebSocketServer } from "ws";
import { validateApiKey } from "../utils/validateApiKey.js";
import { InterviewHandler } from "./InterviewHandlers.js";

// --- Registry for active handlers ---
const activeHandlers = new Map(); // userId -> InterviewHandler

export function getHandler(userId) {
  return activeHandlers.get(userId.toString());
}

export function setHandler(userId, handler) {
  activeHandlers.set(userId.toString(), handler);
}

export function removeHandler(userId) {
  activeHandlers.delete(userId.toString());
}
// -----------------------------------

export function setupInterviewSocket() {
  // Validate AssemblyAI API key on startup
  if (!validateApiKey()) {
    console.error("🚨 Missing or invalid AssemblyAI API key. Server shutting down.");
    process.exit(1);
  }

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, req) => {
    console.log("🟢 Interview socket connected");

    // Create a new handler for this connection
    const handler = new InterviewHandler(req.user._id, ws, req);

    // Store handler globally
    setHandler(req.user._id, handler);

    // Handle all incoming messages
    ws.on("message", async (msg) => {
      let data;
      try {
        data = JSON.parse(msg);
      } catch (err) {
        return handler.sendError("Invalid JSON format.", true);
      }

      if (!data.type) {
        return handler.sendError("Message type is required.", true);
      }

      try {
        switch (data.type) {
          case "start":
            if (!data.interviewId) return handler.sendError("Interview ID is missing.", true);
            await handler.startInterview(data.interviewId);
            break;

          case "response":
            if (!data.response) return handler.sendError("Response is missing.", true);
            await handler.handleResponse(data);
            break;

          default:
            handler.sendError("Unknown message type.");
        }
      } catch (err) {
        console.error("Error handling message:", err);
        handler.sendError("Internal server error.", false);
      }
    });

    // Handle socket close
    ws.on("close", () => {
      removeHandler(req.user._id); // remove from registry
      handler.connectionActive = false;
      console.log("🔴 Interview socket closed");
    });
  });

  return wss;
}
