// interviewsocket.js
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
    let isProcessing = false;
    let connectionActive = true;

    const sendMessage = (message) => {
      if (connectionActive && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(message));
          return true;
        } catch (error) {
          console.error("Failed to send message:", error);
          connectionActive = false;
          return false;
        }
      }
      return false;
    };

    const sendError = (message, shouldClose = false) => {
      console.error(`Error sent to client: ${message}`);
      const sent = sendMessage({ type: "error", message });
      if (shouldClose && sent) {
        setTimeout(() => ws.close(), 100);
      }
    };

    // Enhanced keep alive with connection validation
    keepAliveInterval = setInterval(() => {
      if (connectionActive && ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(keepAliveInterval);
      }
    }, 30000);

    ws.on("message", async (msg) => {
      if (!connectionActive || isProcessing) return;

      let data;
      try {
        data = JSON.parse(msg);
      } catch (err) {
        return sendError("Invalid JSON format.", true);
      }

      if (!data.type) {
        return sendError("Message type is required.", true);
      }

      isProcessing = true;

      try {
        if (data.type === "start") {
          await handleStartInterview(data);
        } else if (data.type === "response") {
          await handleResponse(data);
        } else {
          sendError("Unknown message type.");
        }
      } catch (err) {
        console.error("Error processing message:", err);
        sendError("An internal server error occurred.");
      } finally {
        isProcessing = false;
      }
    });

    const handleStartInterview = async (data) => {
      if (!data.interviewId) {
        return sendError("Interview ID is missing.", true);
      }

      try {
        interviewData = await Interview.findById(data.interviewId);
        if (!interviewData) {
          return sendError("Interview not found.", true);
        }

        console.log("Interview found:", interviewData._id);

        // Authorize user
        if (!req.user || interviewData.userId.toString() !== req.user._id) {
          return sendError("Unauthorized access.", true);
        }

        // Update interview status
        interviewData.status = 'in-progress';
        await interviewData.save();

        // Initialize interview state
        currentIndex = 0;
        results.length = 0;

        // Send first question
        sendMessage({
          type: "question",
          question: interviewData.questions[currentIndex],
          questionIndex: currentIndex,
          totalQuestions: interviewData.questions.length
        });

      } catch (error) {
        console.error("Error starting interview:", error);
        sendError("Failed to start interview.", true);
      }
    };

    const handleResponse = async (data) => {
      if (!interviewData) {
        return sendError("Interview not started.", true);
      }

      if (!data.response || typeof data.response !== 'string') {
        return sendError("Response is required.", false);
      }

      const question = interviewData.questions[currentIndex];
      console.log("📨 Received response for question:", question);
      console.log("Response text:", data.response);
      const responseText = data.response.trim();

      if (responseText.length < 5) {
        return sendError("Response too short. Please provide a more detailed answer.", false);
      }

      try {
        // Analyze response
        const analysis = await analyzeResponse(responseText, question);

        results.push({
          question,
          response: responseText,
          analysis,
          timestamp: new Date()
        });

        // Send analysis feedback
        sendMessage({ 
          type: "analysis", 
          analysis,
          questionIndex: currentIndex
        });

        // Move to next question or finish
        currentIndex++;

        if (currentIndex < interviewData.questions.length) {
          // Send next question
          sendMessage({
            type: "question",
            question: interviewData.questions[currentIndex],
            questionIndex: currentIndex,
            totalQuestions: interviewData.questions.length
          });
        } else {
          // Interview completed
          await completeInterview();
        }

      } catch (error) {
        console.error("Error processing response:", error);
        sendError("Failed to process your response. Please try again.", false);
      }
    };

    const completeInterview = async () => {
      try {
        // Generate final report
        const finalReport = await summarizeOverallFeedback(results);

        // Update interview with results
        interviewData.results = results;
        interviewData.status = 'completed';
        interviewData.finalReport = finalReport;
        interviewData.completedAt = new Date();
        await interviewData.save();

        // Send final report and end message
        sendMessage({ type: "finalReport", report: finalReport });
        sendMessage({ type: "end", message: "✅ Interview completed successfully!" });
        
        // Close connection after a brief delay
        setTimeout(() => {
          connectionActive = false;
          ws.close();
        }, 1000);

      } catch (error) {
        console.error("Error completing interview:", error);
        sendError("Failed to complete interview.", true);
      }
    };

    ws.on("pong", () => {
      // Connection is alive
    });

    ws.on("close", () => {
      connectionActive = false;
      clearInterval(keepAliveInterval);
      console.log("🔴 Interview socket closed");
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
      connectionActive = false;
      clearInterval(keepAliveInterval);
    });
  });

  return wss;
}
