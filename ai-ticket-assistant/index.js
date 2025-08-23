import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import { parse } from "url";
import jwt from "jsonwebtoken";

import userRoutes from "./routes/user.js";
import TicketRoutes from "./routes/ticket.js";
import interviewRoutes from "./routes/interview.js";

import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { onUserSignup } from "./inngest/function/on-signup.js";
import { onTicketCreated } from "./inngest/function/on-ticket-create.js";

import { setupInterviewSocket } from "./websocket/server.js";        // returns interviewWSS
import { createAssemblySocket } from "./websocket/assemblysocket.js"; // returns assemblyWSS
import cookieParser from "cookie-parser";
// import { AssemblyAI } from "assemblyai"; // ❌ Not used as Express middleware; remove or use where needed

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize WS servers (both with noServer: true)
const interviewWSS = setupInterviewSocket();
const assemblyWSS = createAssemblySocket();

/**
 * CENTRALIZED, SINGLE-CALL UPGRADE HANDLER
 * - Only ONE handleUpgrade per request
 * - JWT required only for /ws/interview
 * - Assembly route is /assembly (add /ws/assembly alias if you like)
 */
server.on("upgrade", (req, socket, head) => {
  const { pathname, query } = parse(req.url, true);

  // --- Interview route with JWT ---
  if (pathname === "/ws/interview") {
    const token = query?.token;
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

        console.log("Decoded JWT:", decoded);

      // Attach user for downstream handlers if they read it
      req.user = decoded;

      interviewWSS.handleUpgrade(req, socket, head, (ws) => {
        interviewWSS.emit("connection", ws, req);
      });
    });

    return; // ✅ ensure only one upgrade path runs
  }

  // --- Assembly route (no auth) ---
  if (pathname === "/assembly" || pathname === "/ws/assembly") {
    assemblyWSS.handleUpgrade(req, socket, head, (ws) => {
      assemblyWSS.emit("connection", ws, req);
    });
    return; // ✅ ensure only one upgrade path runs
  }

  // No matching WS endpoint
  socket.destroy();
});

// === EXPRESS SETUP ===
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser())

app.use(
  "/api/inngest",
  serve({ client: inngest, functions: [onUserSignup, onTicketCreated] })
);
app.use("/api/auth", userRoutes);
app.use("/ticket", TicketRoutes);
app.use("/interview", interviewRoutes);

// ❌ DO NOT do: app.use("/", AssemblyAI)
// If you need AssemblyAI, instantiate and use it in your assembly socket module only.

const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () => {
      console.log(`🚀 Server + WS running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
