import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import { parse } from "url";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/user.js";
import TicketRoutes from "./routes/ticket.js";
import interviewRoutes from "./routes/interview.js";

import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";

import { onTicketCreated } from "./inngest/function/on-ticket-create.js";

import { setupInterviewSocket } from "./websocket/server.js";
import { createAssemblySocket } from "./websocket/assemblysocket.js";
import { InterviewHandler } from "./websocket/InterviewHandlers.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ------------------------------
// Setup WebSocket servers
// ------------------------------
const interviewWSS = setupInterviewSocket(); // returns WebSocketServer
const activeInterviews = new Map(); // userId -> ws

// Track active interview connections
interviewWSS.on("connection", (ws, req) => {
  if (req.user?._id) {
        const handler = new InterviewHandler(req.user._id, ws, req);
    activeInterviews.set(req.user._id,{ws,handler} );

      req.onResponseFromAssembly = (responseText) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: "response",
          response: responseText
        }));
      }
    };
    ws.on("close", () => activeInterviews.delete(req.user._id));
  }
});

const assemblyWSS = createAssemblySocket((userId) => {
  const record = activeInterviews.get(userId);
  return record ? { ws: record.ws, handler: record.handler } : null;
});

// ------------------------------
// JWT helper
// ------------------------------
const verifyJWT = (token, secret) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

// ------------------------------
// Central WS upgrade handler
// ------------------------------
server.on("upgrade", async (req, socket, head) => {
  const { pathname, query } = parse(req.url, true);

  // Interview WS with JWT
  if (pathname === "/ws/interview") {
    const token = query?.token;
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      const decoded = await verifyJWT(token, process.env.JWT_SECRET);
      req.user = decoded;

      interviewWSS.handleUpgrade(req, socket, head, (ws) => {
        ws.user = decoded;
        interviewWSS.emit("connection", ws, req);
      });
    } catch (err) {
      console.error("JWT verification failed:", err);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
    return;
  }

  // Assembly WS (needs userId query param)
if (pathname === "/assembly" || pathname === "/ws/assembly") {
  // extract token from query or cookies
  const token = query?.token || (req.headers.cookie && cookie.parse(req.headers.cookie).token);
  if (!token) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  try {
    const decoded = await verifyJWT(token, process.env.JWT_SECRET);
    req.user = decoded; 
    const userId = decoded._id;
    //  attach user to req

    assemblyWSS.handleUpgrade(req, socket, head, (ws) => {
      assemblyWSS.emit("connection", ws, req);
    });
  } catch (err) {
    console.error("JWT verification failed:", err);
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
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, process.env.CORS_ORIGIN].filter(Boolean)
    : process.env.CORS_ORIGIN,
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api/inngest", serve({ client: inngest, onTicketCreated }));
app.use("/api/auth", userRoutes);
app.use("/ticket", TicketRoutes);
app.use("/interview", interviewRoutes);

// ------------------------------
// Start server + DB
// ------------------------------
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log(" MongoDB connected");
    server.listen(PORT, () => {
      console.log(`🚀 Server + WS running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(" MongoDB connection error:", err);
  });
