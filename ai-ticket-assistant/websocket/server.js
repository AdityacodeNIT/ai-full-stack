import { WebSocketServer } from "ws";
import Interview from "../models/interview.js";
import { analyzeResponse } from "../utils/analyzeResponse.js";
import { validateApiKey } from "../utils/validateApiKey.js";
// import { generateFinalReport } from "../utils/generateFinalReport.js"; // Uncomment if needed

export function setupInterviewSocket() {

  
  const isValidKey = async () =>{ validateApiKey()};
  if (!isValidKey) {
    console.error('🚨 Invalid AssemblyAI API key. Server shutting down.');
    process.exit(1);
  }

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    console.log("🟢 Interview socket connected");

    let currentIndex = 0;
    let interviewData = null;
    const results = [];
    let interval;

    // helper to send errors to client
    const sendError = (message, shouldClose = false) => {
      console.error(`Error sent to client: ${message}`);
      ws.send(JSON.stringify({ type: "error", message }));
      if (shouldClose) ws.close();
    };

    // keep connection alive
    interval = setInterval(() => {
      ws.ping();
    }, 30000);

    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg);

        // --- Interview Start ---
        if (data.type === "start") {
          interviewData = await Interview.findById(data.interviewId);

          if (!interviewData || !interviewData.questions?.length) {
            return sendError("Interview not found or has no questions.", true);
          }

          currentIndex = 0;
          results.length = 0;

          // send first question
          ws.send(
            JSON.stringify({
              type: "question",
              question: interviewData.questions[currentIndex],
            })
          );
        }

        // --- Response from client ---
        else if (data.type === "response") {
          if (!interviewData) {
            return sendError("Interview not started.", true);
          }

          const question = interviewData.questions[currentIndex];
          const responseText = data.response;
          console.log("📨 Response:", responseText);

          // analyze the response
          const analysis = await analyzeResponse(responseText, question);

          // save results
          results.push({
            question,
            yourResponse: responseText,
            ...analysis, // expected to return { summary, idealAnswer }
          });

          // send feedback
          ws.send(JSON.stringify({ type: "analysis", analysis }));

          currentIndex++;

          // next step: another question or end
          if (currentIndex < interviewData.questions.length) {
            ws.send(
              JSON.stringify({
                type: "question",
                question: interviewData.questions[currentIndex],
              })
            );
          } else {
            // interview is over
            // const finalReport = generateFinalReport(results);
            // ws.send(JSON.stringify({ type: "finalReport", report: finalReport }));

            ws.send(
              JSON.stringify({ type: "end", message: "Interview complete!" })
            );

            interviewData.results = results;
            await interviewData.save();

            ws.close();
          }
        }
      } catch (err) {
        console.error("Error processing message:", err);
        sendError("An internal server error occurred.");
      }
    });

    ws.on("close", () => {
      clearInterval(interval);
      console.log("🔴 Interview socket closed");
    });
  });

  return wss;
}
