import Interview from "../models/interview.js";
import { analyzeResponse, summarizeOverallFeedback } from "../utils/analyzeresponse.js";

export class InterviewHandler {
  constructor(userId, ws, req) {
    this.userId = userId;
    this.ws = ws;
    this.req = req;
    this.interviewData = null;
    this.currentIndex = 0;
    this.results = [];
    this.isProcessing = false;
    this.connectionActive = true;

    // Buffer responses arriving before startInterview is called
    this.earlyResponses = [];
      this.isInterviewReady = false;

    // Bind methods
    this.handleResponse = this.handleResponse.bind(this);
    this.startInterview = this.startInterview.bind(this);
    this.completeInterview = this.completeInterview.bind(this);
  }





  sendMessage(message) {
    if (this.connectionActive && this.ws.readyState === this.ws.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (err) {
        console.error("Failed to send message:", err);
        this.connectionActive = false;
        return false;
      }
    }
    return false;
  }

  sendError(message, shouldClose = false) {
    console.error("Error sent to client:", message);
    const sent = this.sendMessage({ type: "error", message });
    if (shouldClose && sent) setTimeout(() => this.ws.close(), 100);
  }

async startInterview(interviewId) {
  console.log("🟢 Starting interview..");
  this.isInterviewReady = true;
  if (!interviewId) return this.sendError("Interview ID is missing.", true);

  try {
    // Fetch interview

    this.interviewData = await Interview.findById(interviewId);
        console.log("Interview userId:", this.interviewData.userId);
console.log("Request userId:", this.req.user._id);
    if (!this.interviewData) return this.sendError("Interview not found.", true);

    // Authorization
 if (!this.req.user || this.interviewData.userId.toString() !== this.req.user._id.toString()) {
  return this.sendError("Unauthorized access.", true);
}

    // Update status
    this.interviewData.status = "in-progress";
    await this.interviewData.save();

    // Initialize session state
    this.currentIndex = 0;
    this.results = [];
    this.isInterviewReady = true; // ✅ mark as ready

    // Send first question
    if (!this.interviewData.questions?.length) {
      return this.sendError("No questions available for this interview.", true);
    }

    this.sendMessage({
      type: "question",
      question: this.interviewData.questions[this.currentIndex],
      questionIndex: this.currentIndex,
      totalQuestions: this.interviewData.questions.length,
    });

    // Process any queued responses asynchronously
    setImmediate(async () => {
      while (this.earlyResponses.length > 0) {
        const queued = this.earlyResponses.shift();
        await this.handleResponse(queued);
      }
    });

  } catch (err) {
    console.error("Error starting interview:", err);
    this.sendError("Failed to start interview.", true);
  }
}

async handleResponse(data) {
  console.log("🟢 Handling response..")
  console.log(this.isInterviewReady);
  console.log(this.interviewData);
  console.log(data);
  if (!this.isInterviewReady) {
    console.warn("Interview not ready yet, queueing response...");
    this.earlyResponses.push(data);
    return;
  }

  if (!data.response || typeof data.response !== "string") {
    return this.sendError("Response is required.", false);
  }

  if (this.isProcessing) return; // prevent race
  this.isProcessing = true;
  console.log(data.response);

  const responseText = data.response.trim();
  const question = this.interviewData.questions[this.currentIndex];

  try {
    if (responseText.length < 5) {
      this.sendError("Response too short. Please provide a more detailed answer.", false);
      return;
    }

    // Analyze response
    const analysis = await analyzeResponse(responseText, question);

    this.results.push({
      question,
      response: responseText,
      analysis,
      timestamp: new Date(),
    });

    // Send analysis feedback
    this.sendMessage({ type: "analysis", analysis, questionIndex: this.currentIndex });

    // Next question or complete
    this.currentIndex++;
    if (this.currentIndex < this.interviewData.questions.length) {
      this.sendMessage({
        type: "question",
        question: this.interviewData.questions[this.currentIndex],
        questionIndex: this.currentIndex,
        totalQuestions: this.interviewData.questions.length,
      });
    } else {
      await this.completeInterview();
    }
  } catch (err) {
    console.error("Error processing response:", err);
    this.sendError("Failed to process your response. Please try again.", false);
  } finally {
    this.isProcessing = false;
  }
}

  async completeInterview() {
    try {
      const finalReport = await summarizeOverallFeedback(this.results);

      this.interviewData.results = this.results;
      this.interviewData.status = "completed";
      this.interviewData.finalReport = finalReport;
      this.interviewData.completedAt = new Date();
      await this.interviewData.save();

      this.sendMessage({ type: "finalReport", report: finalReport });
      this.sendMessage({ type: "end", message: "✅ Interview completed successfully!" });

      // Close after delay
      setTimeout(() => {
        this.connectionActive = false;
        this.ws.close();
      }, 1000);
    } catch (err) {
      console.error("Error completing interview:", err);
      this.sendError("Failed to complete interview.", true);
    }
  }
}
