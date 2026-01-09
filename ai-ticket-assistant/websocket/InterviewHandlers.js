import Interview from "../models/interview.js";
import User from "../models/user.model.js";
import { InterviewAgentAdapter } from "../inngest/agent/interviewAgentAdapter.js";

export class InterviewHandler {
  constructor(userId, ws, req) {
    this.userId = userId;
    this.ws = ws;
    this.req = req;

    // Interview runtime state
    this.interviewData = null;
    this.agent = null;
    this.currentQuestion = null;
    this.questionCount = 0;
    this.results = [];

    // Control flags
    this.isProcessing = false;
    this.isInterviewReady = false;
    this.connectionActive = true;

    // Buffer early answers
    this.earlyResponses = [];

    this.startInterview = this.startInterview.bind(this);
    this.handleResponse = this.handleResponse.bind(this);
    this.completeInterview = this.completeInterview.bind(this);
  }

  /* ─────────────────────────────
     WebSocket helpers
  ───────────────────────────── */

  sendMessage(payload) {
    if (
      this.connectionActive &&
      this.ws &&
      this.ws.readyState === this.ws.OPEN
    ) {
      try {
        this.ws.send(JSON.stringify(payload));
        return true;
      } catch (err) {
        console.error("WS send failed:", err);
        this.connectionActive = false;
      }
    }
    return false;
  }

  sendError(message, shouldClose = false) {
    console.error("Interview error:", message);
    this.sendMessage({ type: "error", message });

    if (shouldClose) {
      setTimeout(() => {
        this.connectionActive = false;
        this.ws.close();
      }, 100);
    }
  }

  /* ─────────────────────────────
     Interview lifecycle
  ───────────────────────────── */

  async startInterview(interviewId) {
    try {
      this.interviewData = await Interview.findById(interviewId);
      if (!this.interviewData) {
        return this.sendError("Interview not found", true);
      }

      // Authorization
      if (
        !this.req.user ||
        this.interviewData.userId.toString() !==
          this.req.user._id.toString()
      ) {
        return this.sendError("Unauthorized access", true);
      }

      // Initialize Agent with CONTEXT (🔥 critical)
      this.agent = new InterviewAgentAdapter({
        role: this.interviewData.role,
        level: this.interviewData.level,
        techstack: this.interviewData.techstack,
        focus: this.interviewData.type || "balanced",
        maxQuestions: this.interviewData.numberOfQuestions || 10,
      });

      // Update interview state
      this.interviewData.status = "in-progress";
      await this.interviewData.save();

      this.questionCount = 0;
      this.results = [];
      this.isInterviewReady = true;

      // 🔥 Ask opening question (context-aware)
      const opening = await this.agent.generateOpeningQuestion();

      console.log("Generated opening question:", opening);

      if (!opening?.question) {
        return this.sendError("Failed to generate opening question", true);
      }

      this.currentQuestion = opening.question;
      this.questionCount++;

      this.sendMessage({
        type: "question",
        question: this.currentQuestion,
        questionNumber: this.questionCount,
      });

      // Drain queued responses
      setImmediate(async () => {
        while (this.earlyResponses.length) {
          await this.handleResponse(this.earlyResponses.shift());
        }
      });
    } catch (err) {
      console.error("startInterview failed:", err);
      this.sendError("Failed to start interview", true);
    }
  }

  /* ─────────────────────────────
     Handle answer
  ───────────────────────────── */

  async handleResponse(data) {
    if (!this.isInterviewReady) {
      this.earlyResponses.push(data);
      return;
    }

    if (this.isProcessing) return;

    const responseText = data?.response?.trim();
    if (!responseText || responseText.length < 5) {
      return this.sendError("Response too short");
    }

    this.isProcessing = true;

    try {
      // 🔥 Agent evaluates answer + decides next step
      const { evaluation, decision } =
        await this.agent.processAnswer({
          question: this.currentQuestion,
          answer: responseText,
        });

      // Store result
      this.results.push({
        question: this.currentQuestion,
        response: responseText,
        evaluation,
        timestamp: new Date(),
      });

      // Send evaluation feedback
      this.sendMessage({
        type: "analysis",
        analysis: evaluation,
        questionNumber: this.questionCount,
      });

      // Decide whether to continue
     if (
  decision?.shouldEnd === true ||
  this.questionCount >= (this.interviewData.numberOfQuestions || 10)
) {
  await this.completeInterview();
  return;
}

// ❗ Only stop if BOTH are true
if (!decision?.question && decision?.shouldEnd === true) {
  await this.completeInterview();
  return;
}

// ❗ If no question but shouldEnd is false → ask again
if (!decision?.question && decision?.shouldEnd === false) {
  console.warn("No question generated yet, retrying next question");
  return;
}


      // Ask next question
     if (typeof decision.question === "string") {
  this.currentQuestion = decision.question;
  this.questionCount++;

  this.sendMessage({
    type: "question",
    question: this.currentQuestion,
    questionNumber: this.questionCount,
  });
}

    } catch (err) {
      console.error("handleResponse failed:", err);
      this.sendError("Failed to process response");
    } finally {
      this.isProcessing = false;
    }
  }

  /* ─────────────────────────────
     Interview completion
  ───────────────────────────── */

  async completeInterview() {
    try {
      // 🔥 Agent summarizes interview
      const finalReport = await this.agent.summarizeInterview();

      this.interviewData.results = this.results;
      this.interviewData.finalReport = finalReport;
      this.interviewData.status = "completed";
      this.interviewData.completedAt = new Date();
      await this.interviewData.save();

      // Optional: update moderator skills
      const user = await User.findById(this.userId);
      if (user && finalReport?.averageScore) {
        for (const skill of [
          ...(finalReport.keyStrengths || []),
          ...(finalReport.areasForImprovement || []),
        ]) {
          const idx = user.skills.findIndex(
            s => s.name.toLowerCase() === skill.toLowerCase()
          );

          if (idx > -1) {
            user.skills[idx].proficiency = finalReport.averageScore;
          } else {
            user.skills.push({
              name: skill,
              proficiency: finalReport.averageScore,
            });
          }
        }
        await user.save();
      }

      this.sendMessage({
        type: "finalReport",
        report: finalReport,
      });

      this.sendMessage({
        type: "end",
        message: "Interview completed successfully",
      });

      setTimeout(() => {
        this.connectionActive = false;
        this.ws.close();
      }, 1000);
    } catch (err) {
      console.error("completeInterview failed:", err);
      this.ws.close();
    }
  }
}
