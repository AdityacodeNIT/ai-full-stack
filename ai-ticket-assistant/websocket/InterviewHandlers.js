import { InterviewAgentAdapter } from "../inngest/agent/interviewAgentAdapter.js";
import { logger } from "../utils/logger.js";
import { WebSocketGateway } from "../services/Interview/WebSocketGateway.js";
import { InterviewService } from "../services/Interview/InterviewService.js";
import { ProctoringService } from "../services/Interview/ProctoringService.js";
import { EvaluationService } from "../services/Interview/EvaluationService.js";
import { UserSkillService } from "../services/Interview/UserSkillService.js";
import { InterviewSession } from "../services/Interview/InterviewSession.js";

export class InterviewHandler {
  constructor(clerkUserId, ws, req) {
    this.userId = clerkUserId;
    this.req = req;
    this.wsGateway = new WebSocketGateway(ws);

    // Interview runtime state
    this.interviewData = null;
    this.agent = null;

    this.interviewService = new InterviewService();
    this.proctoringService = new ProctoringService();
    this.userSkillService = new UserSkillService();
    this.session = new InterviewSession();

    this.startInterview = this.startInterview.bind(this);
    this.handleResponse = this.handleResponse.bind(this);
    this.completeInterview = this.completeInterview.bind(this);
    this.handleProctoringViolation = this.handleProctoringViolation.bind(this);
  }
  
  // Interview lifecycle

  async startInterview(interviewId) {
    try {
      this.interviewData =
        await this.interviewService.findInterviewById(interviewId);

      if (!this.interviewData) {
        logger.error(" Interview not found:", interviewId);
        return this.wsGateway.sendError(
          "Interview not found. Please create a new interview.",
          true,
        );
      }
      //  AUTHORIZATION (Clerk-based)
      if (this.interviewData.userId !== this.userId) {
        return this.wsGateway.sendError(
          "Unauthorized: This interview belongs to another user.",
          true,
        );
      }

      // Check if interview already completed
      if (this.interviewData.status === "completed") {
        logger.warn(" Attempting to restart completed interview");
        return this.wsGateway.sendError(
          "This interview has already been completed.",
          true,
        );
      }

      // Initialize Agent with validation
      const agentConfig = {
        role: this.interviewData.role || "Software Developer",
        level: this.interviewData.level || "Junior",
        techstack: this.interviewData.techstack || [],
        focus: this.interviewData.type || "balanced",
        maxQuestions: this.interviewData.numberOfQuestions || 5,
      };

      logger.log(
        "🔧 Agent configuration:",
        JSON.stringify(agentConfig, null, 2),
      );

      this.agent = new InterviewAgentAdapter(agentConfig);
      this.session = new InterviewSession(); // Will be true after questions generated

      // Send loading message
      this.wsGateway.sendMessage({
        type: "loading",
        message: `Generating ${agentConfig.maxQuestions} personalized questions for ${agentConfig.level} ${agentConfig.role}...`,
      });

      logger.log("Generating opening question...");
      const opening = await this.agent.generateOpeningQuestion();
      if (!opening?.question) {
        logger.error("Failed to generate opening question");
        return this.wsGateway.sendError(
          "Failed to generate interview questions. Please try again.",
          true,
        );
      }

      // NOW mark interview as started
      await this.interviewService.startInterview(this.interviewData);

      this.session.startNewQuestion(opening.question);
      this.session.markReady();

      logger.log(
        " Sending first question:",
        this.session.currentQuestion.substring(0, 100) + "...",
      );
      this.wsGateway.sendMessage({
        type: "question",
        question: this.session.currentQuestion,
        questionNumber: this.session.questionCount,
        totalQuestions: agentConfig.maxQuestions,
        questionId: this.session.currentQuestionId, // Send ID to frontend
      });
      // Drain early responses
      setImmediate(async () => {
        while (this.session.hasEarlyResponses()) {
          const buffered = this.session.popEarlyResponse();
          await this.handleResponse(buffered);
        }
      });
    } catch (err) {
      logger.error(" startInterview failed:", err);
      logger.error("Stack trace:", err.stack);
      this.wsGateway.sendError(
        `Failed to start interview: ${err.message}. Please try again.`,
        true,
      );
    }
  }

  async handleResponse(data) {
    if (!this.session.isInterviewReady) {
      this.session.bufferEarlyResponse(data);
      return;
    }

    //  CRITICAL: Prevent duplicate processing
    if (this.session.isProcessing) {
      logger.log("Already processing, ignoring duplicate response");
      return;
    }

    const responseText = data?.response?.trim();
    if (!responseText || responseText.length < 5) {
      return this.wsGateway.sendError("Response too short");
    }

    if (this.session.isDuplicateResponse(responseText)) {
      return;
    }
    this.session.markProcessing(true);

    try {
      logger.log(
        ` Processing answer for question ${this.session.questionCount}...`,
      );

      // Store answer and get next question (NO API call in batch mode)
      const { evaluation, decision } = await this.agent.processAnswer({
        question: this.session.currentQuestion,
        answer: responseText,
      });

      this.session.addResult({
        question: this.session.currentQuestion,
        response: responseText,
        evaluation, // Will be null in batch mode
        timestamp: new Date(),
        questionNumber: this.session.questionCount,
      });

      // Only send analysis if we have one (adaptive mode)
      if (evaluation) {
        this.wsGateway.sendMessage({
          type: "analysis",
          analysis: evaluation,
          questionNumber: this.session.questionCount,
        });
      } else {

        // Batch mode: just acknowledge answer received
        this.wsGateway.sendMessage({
          type: "acknowledgment",
          message: "Answer recorded successfully",
          questionNumber: this.session.questionCount,
          totalQuestions: this.interviewData.numberOfQuestions || 5,
          progress: Math.round(
            (this.session.questionCount /
              (this.interviewData.numberOfQuestions || 5)) *
              100,
          ),
        });
      }
      if (
        decision?.shouldEnd === true ||
        this.session.questionCount >=
          (this.interviewData.numberOfQuestions || 10)
      ) {
        logger.log(" Interview complete, starting evaluation...");

        // Send evaluation loading message
        this.wsGateway.sendMessage({
          type: "evaluating",
          message: "Analyzing your complete interview...",
        });

        await this.completeInterview();
        return;
      }

      if (typeof decision?.question === "string") {
        this.session.startNewQuestion(decision.question);
        this.wsGateway.sendMessage({
          type: "question",
          question: this.session.currentQuestion,
          questionNumber: this.session.questionCount,
          totalQuestions: this.interviewData.numberOfQuestions || 5,
          questionId: this.session.currentQuestionId, // Send ID to frontend
          progress: Math.round(
            (this.session.questionCount /
              (this.interviewData.numberOfQuestions || 5)) *
              100,
          ),
        });
      }
    } catch (err) {
      logger.error(" handleResponse failed:", err);
      logger.error("Stack trace:", err.stack);
      this.wsGateway.sendError(
        `Failed to process response: ${err.message}. Please try again.`,
      );
    } finally {
      this.session.markProcessing(false);
    }
  }

  //  Proctoring violation handler

  async handleProctoringViolation(data) {
    this.proctoringService.recordViolation(data, this.session.questionCount);
  }

  // Interview completion

  async completeInterview() {
    try {
      const evaluationService = new EvaluationService(this.agent);
      const { finalReport, updatedResults } =
        await evaluationService.evaluateInterview(this.session.results);
      this.session.results = updatedResults;

      // Save to database
      await this.interviewService.completeInterview(
        this.interviewData,
        this.session.results,
        finalReport,
        this.proctoringService.getViolations(),
      );

      //  Log proctoring violations summary
      this.proctoringService.logSummary();

      //  Update user skills based on evaluation
      await this.userSkillService.updateSkills(this.userId, finalReport);

      this.wsGateway.sendMessage({
        type: "finalReport",
        report: {
          ...finalReport,
          interviewId: this.interviewData._id,
          duration: this.interviewData.duration,
          completedAt: this.interviewData.completedAt,
        },
      });

      this.wsGateway.sendMessage({
        type: "end",
        message: "Interview completed successfully! Thank you for your time.",
        score: finalReport.overallScore,
        recommendation: finalReport.recommendation,
      });

      this.wsGateway.close(2000);
    } catch (err) {
      logger.error(" completeInterview failed:", err);
      logger.error("Stack trace:", err.stack);

      // Try to save partial results

      try {
        await this.interviewService.failInterview(
          this.interviewData,
          this.session.results,
          err.message,
        );
      } catch (saveErr) {
        logger.error(" Failed to save partial data:", saveErr);
      }

      this.wsGateway.sendError(
        `Failed to complete interview evaluation: ${err.message}. Your answers have been saved.`,
      );

      this.wsGateway.close(1000);
    }
  }
}
