import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import { parse } from "url";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/user.js";
import interviewRoutes from "./routes/interview.js";

import { setupInterviewSocket } from "./websocket/server.js";
import { createAssemblySocket } from "./websocket/assemblysocket.js";
import { clerkMiddleware } from '@clerk/express'  

dotenv.config();

const app = express();
const server = http.createServer(app);

// ------------------------------
// Setup WebSocket servers
// ------------------------------
const interviewWSS = setupInterviewSocket();
const assemblyWSS = createAssemblySocket();

// ------------------------------
// Central WS upgrade handler
// ------------------------------
server.on("upgrade", async (req, socket, head) => {
  const { pathname, query } = parse(req.url, true);

  // Interview WebSocket with Clerk JWT
  if (pathname === "/ws/interview") {
    const token = query?.token;
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      // Decode Clerk JWT (don't verify signature, trust Clerk)
      const decoded = jwt.decode(token);
      
      if (!decoded?.sub) {
        throw new Error("Invalid Clerk token - missing sub");
      }

      // ✅ Attach clerkUserId to request
      req.clerkUserId = decoded.sub;

      interviewWSS.handleUpgrade(req, socket, head, (ws) => {
        console.log("🔄 handleUpgrade callback - emitting connection event");
        interviewWSS.emit("connection", ws, req);
        console.log("✅ Connection event emitted");
      });
    } catch (err) {
      console.error("❌ Interview WS auth failed:", err.message);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
    return;
  }

  // Assembly WebSocket with Clerk JWT
  if (pathname === "/assembly" || pathname === "/ws/assembly") {
    const token = query?.token;
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      const decoded = jwt.decode(token);
      
      if (!decoded?.sub) {
        throw new Error("Invalid Clerk token - missing sub");
      }

      req.clerkUserId = decoded.sub;

      assemblyWSS.handleUpgrade(req, socket, head, (ws) => {
        assemblyWSS.emit("connection", ws, req);
      });
    } catch (err) {
      console.error("❌ Assembly WS auth failed:", err.message);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
    return;
  }

  socket.destroy();
});

// ------------------------------
// Express middlewares
// ------------------------------
const allowedOrigins = (() => {
  if (process.env.NODE_ENV === "production") {
    return [
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN
    ].filter(Boolean);
  }

  return process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
    : [];
})();

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(clerkMiddleware())
app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api/auth", userRoutes);
app.use("/interview", interviewRoutes);

// ------------------------------
// Start server + DB
// ------------------------------
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
