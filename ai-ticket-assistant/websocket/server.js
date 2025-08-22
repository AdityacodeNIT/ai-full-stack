import { WebSocketServer } from "ws";
import Interview from "../models/interview.js";
import { analyzeResponse, summarizeOverallFeedback } from "../utils/analyzeresponse.js";
import { validateApiKey } from "../utils/validateApiKey.js";

export function setupInterviewSocket() {
  // Validate AssemblyAI API key on startup
  if (!validateApiKey()) {
    console.error('🚨 Missing or invalid AssemblyAI API key. Server shutting down.');
    process.exit(1);
  }

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, req) => {
    console.log("🟢 Interview socket connected");

    let currentIndex = 0;
    let interviewData = null;
    const results = [];
    let keepAliveInterval;

    const sendError = (message, shouldClose = false) => {
      console.error(`Error sent to client: ${message}`);
      try {
        ws.send(JSON.stringify({ type: "error", message }));
        if (shouldClose) ws.close();
      } catch (e) {
        console.error("Failed to send error to client:", e);
      }
    };

    // Keep connection alive
    keepAliveInterval = setInterval(() => {
      ws.ping();
    }, 30000);

    ws.on("message", async (msg) => {
      let data;
      try {
        data = JSON.parse(msg);
      } catch (err) {
        return sendError("Invalid JSON format.", true);
      }

      try {
        if (data.type === "start") {
          if (!data.interviewId) {
            return sendError("Interview ID is missing.", true);
          }

          interviewData = await Interview.findById(data.interviewId);
          if (!interviewData) {
            return sendError("Interview not found.", true);
          }

          // Authorize user (req.user is attached by the auth middleware in index.js)
          if (interviewData.userId.toString() !== req.user.id) {
            return sendError("Unauthorized access.", true);
          }

          interviewData.status = 'in-progress';
          await interviewData.save();

          currentIndex = 0;
          results.length = 0;

          ws.send(JSON.stringify({
            type: "question",
            question: interviewData.questions[currentIndex],
          }));
        } else if (data.type === "response") {
          if (!interviewData) {
            return sendError("Interview not started.", true);
          }

          const question = interviewData.questions[currentIndex];
          const responseText = data.response;

          const analysis = await analyzeResponse(responseText, question);

          results.push({
            question,
            response: responseText,
            analysis,
          });

          ws.send(JSON.stringify({ type: "analysis", analysis }));

          currentIndex++;

          if (currentIndex < interviewData.questions.length) {
            ws.send(JSON.stringify({
              type: "question",
              question: interviewData.questions[currentIndex],
            }));
          } else {
            const finalReport = await summarizeOverallFeedback(results);

            // Update interview with results
            interviewData.results = results;
            interviewData.status = 'completed';
            interviewData.finalReport = finalReport;
            await interviewData.save();

            ws.send(JSON.stringify({ type: "finalReport", report: finalReport }));
            ws.send(JSON.stringify({ type: "end", message: "✅ Interview complete." }));
            ws.close();
          }
        }
      } catch (err) {
        console.error("Error processing message:", err);
        sendError("An internal server error occurred.");
      }
    });

    ws.on("close", () => {
      clearInterval(keepAliveInterval);
      console.log("🔴 Interview socket closed");
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
      sendError("A connection error occurred.");
    });
  });

  return wss;
}
