import Interview from "../models/interview.js";
import User from "../models/user.model.js";
import { InterviewAgentAdapter } from "../inngest/agent/interviewAgentAdapter.js";

export class InterviewHandler {
  constructor(clerkUserId, ws, req) {
    this.userId = clerkUserId; // 🔑 Clerk userId
    this.ws = ws;
    this.req = req;

    // Interview runtime state
    this.interviewData = null;
    this.agent = null;
    this.currentQuestion = null;
    this.currentQuestionId = null; // 🔒 Track question ID for deduplication
    this.questionCount = 0;
    this.results = [];

    // Control flags
    this.isProcessing = false;
    this.isInterviewReady = false;
    this.connectionActive = true;

    // Buffer early answers
    this.earlyResponses = [];
    
    // Track processed responses to prevent duplicates
    this.processedResponseIds = new Set();

    this.startInterview = this.startInterview.bind(this);
    this.handleResponse = this.handleResponse.bind(this);
    this.completeInterview = this.completeInterview.bind(this);
  }

  /* ─────────────────────────────
     WebSocket helpers
  ───────────────────────────── */

  sendMessage(payload) {
    if (this.connectionActive && this.ws?.readyState === this.ws.OPEN) {
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
      console.log("🔍 Looking up interview:", interviewId);
      this.interviewData = await Interview.findById(interviewId);
      
      if (!this.interviewData) {
        console.error("❌ Interview not found:", interviewId);
        return this.sendError("Interview not found. Please create a new interview.", true);
      }

      console.log("✅ Interview found:", {
        id: this.interviewData._id,
        userId: this.interviewData.userId,
        currentUserId: this.userId,
        status: this.interviewData.status,
        role: this.interviewData.role,
        level: this.interviewData.level
      });

      // ✅ AUTHORIZATION (Clerk-based)
      if (this.interviewData.userId !== this.userId) {
        console.error("❌ Unauthorized access - userId mismatch:", {
          interviewUserId: this.interviewData.userId,
          currentUserId: this.userId
        });
        return this.sendError("Unauthorized: This interview belongs to another user.", true);
      }

      // Check if interview already completed
      if (this.interviewData.status === "completed") {
        console.warn("⚠️ Attempting to restart completed interview");
        return this.sendError("This interview has already been completed.", true);
      }

      console.log("🤖 Initializing AI agent...");
      
      // Initialize Agent with validation
      const agentConfig = {
        role: this.interviewData.role || "Software Developer",
        level: this.interviewData.level || "Junior",
        techstack: this.interviewData.techstack || [],
        focus: this.interviewData.type || "balanced",
        maxQuestions: this.interviewData.numberOfQuestions || 5,
      };
      
      console.log("🔧 Agent configuration:", JSON.stringify(agentConfig, null, 2));
      
      this.agent = new InterviewAgentAdapter(agentConfig);

      // Update status
      this.interviewData.status = "in-progress";
      this.interviewData.startedAt = new Date();
      await this.interviewData.save();
      console.log("💾 Interview status updated to in-progress");

      this.questionCount = 0;
      this.results = [];
      this.isInterviewReady = false; // Will be true after questions generated

      // Send loading message
      this.sendMessage({
        type: "loading",
        message: `Generating ${agentConfig.maxQuestions} personalized questions for ${agentConfig.level} ${agentConfig.role}...`
      });

      console.log("❓ Generating opening question...");
      const opening = await this.agent.generateOpeningQuestion();
      
      if (!opening?.question) {
        console.error("❌ Failed to generate opening question");
        return this.sendError("Failed to generate interview questions. Please try again.", true);
      }

      this.currentQuestion = opening.question;
      this.questionCount++;
      this.currentQuestionId = `q${this.questionCount}_${Date.now()}`; // 🔒 Unique ID
      this.isInterviewReady = true;

      console.log("✅ Sending first question:", this.currentQuestion.substring(0, 100) + "...");
      this.sendMessage({
        type: "question",
        question: this.currentQuestion,
        questionNumber: this.questionCount,
        totalQuestions: agentConfig.maxQuestions,
        questionId: this.currentQuestionId, // Send ID to frontend
      });

      // Drain early responses
      setImmediate(async () => {
        while (this.earlyResponses.length) {
          await this.handleResponse(this.earlyResponses.shift());
        }
      });
    } catch (err) {
      console.error("❌ startInterview failed:", err);
      console.error("Stack trace:", err.stack);
      this.sendError(`Failed to start interview: ${err.message}. Please try again.`, true);
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

    // 🔒 CRITICAL: Prevent duplicate processing
    if (this.isProcessing) {
      console.log("⚠️ Already processing, ignoring duplicate response");
      return;
    }

    const responseText = data?.response?.trim();
    if (!responseText || responseText.length < 5) {
      return this.sendError("Response too short");
    }

    // 🔒 Check if this response was already processed
    const responseId = `${this.currentQuestionId}_${responseText.substring(0, 50)}`;
    if (this.processedResponseIds.has(responseId)) {
      console.log("⚠️ Duplicate response detected, ignoring");
      return;
    }

    this.isProcessing = true;
    this.processedResponseIds.add(responseId);

    try {
      console.log(`🤖 Processing answer for question ${this.questionCount}...`);
      
      // Store answer and get next question (NO API call in batch mode)
      const { evaluation, decision } =
        await this.agent.processAnswer({
          question: this.currentQuestion,
          answer: responseText,
        });

      this.results.push({
        question: this.currentQuestion,
        response: responseText,
        evaluation, // Will be null in batch mode
        timestamp: new Date(),
        questionNumber: this.questionCount
      });

      // Only send analysis if we have one (adaptive mode)
      if (evaluation) {
        this.sendMessage({
          type: "analysis",
          analysis: evaluation,
          questionNumber: this.questionCount,
        });
      } else {
        // Batch mode: just acknowledge answer received
        this.sendMessage({
          type: "acknowledgment",
          message: "Answer recorded successfully",
          questionNumber: this.questionCount,
          totalQuestions: this.interviewData.numberOfQuestions || 5,
          progress: Math.round((this.questionCount / (this.interviewData.numberOfQuestions || 5)) * 100)
        });
      }

      if (
        decision?.shouldEnd === true ||
        this.questionCount >= (this.interviewData.numberOfQuestions || 10)
      ) {
        console.log("✅ Interview complete, starting evaluation...");
        
        // Send evaluation loading message
        this.sendMessage({
          type: "evaluating",
          message: "Analyzing your complete interview..."
        });
        
        await this.completeInterview();
        return;
      }

      if (typeof decision?.question === "string") {
        this.currentQuestion = decision.question;
        this.questionCount++;
        this.currentQuestionId = `q${this.questionCount}_${Date.now()}`; // 🔒 New ID

        this.sendMessage({
          type: "question",
          question: this.currentQuestion,
          questionNumber: this.questionCount,
          totalQuestions: this.interviewData.numberOfQuestions || 5,
          questionId: this.currentQuestionId, // Send ID to frontend
          progress: Math.round((this.questionCount / (this.interviewData.numberOfQuestions || 5)) * 100)
        });
      }
    } catch (err) {
      console.error("❌ handleResponse failed:", err);
      console.error("Stack trace:", err.stack);
      this.sendError(`Failed to process response: ${err.message}. Please try again.`);
    } finally {
      this.isProcessing = false;
    }
  }

  /* ─────────────────────────────
     Interview completion
  ───────────────────────────── */

  async completeInterview() {
    try {
      console.log("🎯 Completing interview and evaluating all answers...");
      
      const finalReport = await this.agent.summarizeInterview();

      if (!finalReport) {
        throw new Error("Failed to generate final evaluation");
      }

      // Update results with individual evaluations from batch
      if (finalReport?.questionEvaluations && Array.isArray(finalReport.questionEvaluations)) {
        finalReport.questionEvaluations.forEach((evalData, index) => {
          if (this.results[index]) {
            this.results[index].evaluation = {
              confidence: evalData.confidence,
              clarity: evalData.clarity,
              technicalUnderstanding: evalData.technicalUnderstanding,
              summary: evalData.summary,
              score: evalData.score
            };
          }
        });
        console.log(`✅ Updated ${finalReport.questionEvaluations.length} individual evaluations`);
      }

      // Save to database
      this.interviewData.results = this.results;
      this.interviewData.finalReport = finalReport;
      this.interviewData.status = "completed";
      this.interviewData.completedAt = new Date();
      
      // Calculate duration
      if (this.interviewData.startedAt) {
        const duration = Math.round((new Date() - this.interviewData.startedAt) / 1000 / 60); // minutes
        this.interviewData.duration = duration;
        console.log(`⏱️ Interview duration: ${duration} minutes`);
      }
      
      await this.interviewData.save();
      console.log("💾 Interview saved to database");

      // ✅ Update user skills based on evaluation
      const user = await User.findOne({ clerkUserId: this.userId });

      if (user && finalReport?.overallScore) {
        console.log(`👤 Updating user skills (score: ${finalReport.overallScore})`);
        
        // Update user skills based on strengths
        const skillsToUpdate = [
          ...(finalReport.strengths || []),
          ...(finalReport.areasForImprovement || []),
        ];

        for (const skill of skillsToUpdate) {
          const idx = user.skills.findIndex(
            s => s.name.toLowerCase() === skill.toLowerCase()
          );

          if (idx > -1) {
            user.skills[idx].proficiency = finalReport.overallScore;
            user.skills[idx].lastAssessed = new Date();
          } else {
            user.skills.push({
              name: skill,
              proficiency: finalReport.overallScore,
              lastAssessed: new Date()
            });
          }
        }
        
        await user.save();
        console.log(`✅ Updated ${skillsToUpdate.length} skills for user`);
      }

      // Send final report to client
      console.log("📊 Sending final report to client");
      this.sendMessage({ 
        type: "finalReport", 
        report: {
          ...finalReport,
          interviewId: this.interviewData._id,
          duration: this.interviewData.duration,
          completedAt: this.interviewData.completedAt
        }
      });
      
      this.sendMessage({ 
        type: "end", 
        message: "Interview completed successfully! Thank you for your time.",
        score: finalReport.overallScore,
        recommendation: finalReport.recommendation
      });

      console.log("✅ Interview completed successfully");
      console.log(`📈 Final score: ${finalReport.overallScore}/100`);
      console.log(`🎯 Recommendation: ${finalReport.recommendation}`);

      // Close connection after a delay
      setTimeout(() => {
        this.connectionActive = false;
        this.ws.close();
      }, 2000);
    } catch (err) {
      console.error("❌ completeInterview failed:", err);
      console.error("Stack trace:", err.stack);
      
      // Try to save partial results
      try {
        this.interviewData.status = "failed";
        this.interviewData.results = this.results;
        this.interviewData.error = err.message;
        await this.interviewData.save();
        console.log("💾 Saved partial interview data");
      } catch (saveErr) {
        console.error("❌ Failed to save partial data:", saveErr);
      }
      
      this.sendError(`Failed to complete interview evaluation: ${err.message}. Your answers have been saved.`);
      
      setTimeout(() => {
        this.ws.close();
      }, 1000);
    }
  }
}
