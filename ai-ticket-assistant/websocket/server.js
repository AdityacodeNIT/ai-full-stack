import { WebSocketServer } from "ws";
import Interview from "../models/interview.js";
import { analyzeResponse } from "../utils/analyzeResponse.js";
import { summarizeOverallFeedback } from "../utils/analyzeResponse.js"; // new helper!

export function setupInterviewSocket() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, req) => {
    console.log("🟢 Interview socket connected");
    console.log("🔗 Remote Address:", req.socket.remoteAddress);

    let currentIndex = 0;
    let interviewData = null;
    const allAnalyses = [];

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg);

        if (data.type === "start") {
          ws.send(JSON.stringify({ type: "loading" }));

          interviewData = await Interview.findById(data.interviewId);
          if (!interviewData) {
            return ws.send(
              JSON.stringify({ type: "error", message: "Interview not found." })
            );
          }

          currentIndex = 0;
          ws.send(JSON.stringify({
            type: "question",
            question: interviewData.questions[currentIndex]
          }));

        } else if (data.type === "response") {
          const question = interviewData.questions[currentIndex];
          const analysis = await analyzeResponse(data.response);

          // Store for overall summary later
          allAnalyses.push({
            question,
            response: data.response,
            analysis
          });

          ws.send(JSON.stringify({ type: "analysis", analysis }));

          currentIndex++;

          if (currentIndex < interviewData.questions.length) {
            ws.send(JSON.stringify({
              type: "question",
              question: interviewData.questions[currentIndex]
            }));
          } else {
            // interview done – generate final summary
            const finalReport = await summarizeOverallFeedback(allAnalyses);

            ws.send(JSON.stringify({
              type: "finalReport",
              report: finalReport
            }));

            ws.send(JSON.stringify({
              type: "end",
              message: "✅ Interview complete. You can now view your feedback."
            }));

            ws.close();
          }
        }

      } catch (err) {
        console.error("❌ Server error:", err);
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format or server error." }));
      }
    });

    ws.on("close", () => {
      console.log("🔴 Interview socket closed");
    });
  });

  return wss;
}
