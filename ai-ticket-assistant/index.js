import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";
import { parse } from "url";

import userRoutes from "./routes/user.js";
import TicketRoutes from "./routes/ticket.js";
import interviewRoutes from "./routes/interview.js";

import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { onUserSignup } from "./inngest/function/on-signup.js";
import { onTicketCreated } from "./inngest/function/on-ticket-create.js";

import { setupInterviewSocket } from "./websocket/server.js";       // returns interviewWSS
import { createAssemblySocket } from "./websocket/assemblysocket.js";  // returns assemblyWSS
import { AssemblyAI } from "assemblyai";

dotenv.config();
const app = express();
const server = http.createServer(app);

// Initialize WS servers (both with noServer: true)
const interviewWSS = setupInterviewSocket();
const assemblyWSS = createAssemblySocket();

// Centralized upgrade handler
server.on("upgrade", (req, socket, head) => {
  const { pathname } = parse(req.url);

  if (pathname && pathname.startsWith("/ws/interview")) {
    interviewWSS.handleUpgrade(req, socket, head, (ws) => {
      interviewWSS.emit("connection", ws, req);
    });
  } else if (pathname && pathname.startsWith("/ws/assembly")) {
    assemblyWSS.handleUpgrade(req, socket, head, (ws) => {
      assemblyWSS.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

// === EXPRESS SETUP ===
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use(
  "/api/inngest",
  serve({ client: inngest, functions: [onUserSignup, onTicketCreated] })
);
app.use("/api/auth", userRoutes);
app.use("/ticket", TicketRoutes);
app.use("/interview", interviewRoutes);
app.use("/",AssemblyAI)

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
