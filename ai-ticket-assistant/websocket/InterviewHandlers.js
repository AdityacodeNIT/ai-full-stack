import Interview from "../models/interview.js";
import User from "../models/user.model.js"; // Import the User model
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
    console.log("Starting interview..");
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
      this.isInterviewReady = true;

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
    console.log("Handling response..");
    
    if (!this.isInterviewReady) {
      console.warn("Interview not ready yet, queueing response...");
      this.earlyResponses.push(data);
      return;
    }

    if (!data.response || typeof data.response !== "string") {
      return this.sendError("Response is required.", false);
    }

    if (this.isProcessing) return; // prevent race conditions
    this.isProcessing = true;

    const responseText = data.response.trim();
    const question = this.interviewData.questions[this.currentIndex];

    try {
      if (responseText.length < 5) {
        this.sendError("Response too short. Please provide a more detailed answer.", false);
        return;
      }

      console.log("Analyzing response for question:", question);
      console.log("Response text:", responseText);

      // Analyze response
      const analysis = await analyzeResponse(responseText, question);
      console.log("Analysis result:", analysis);

      // Store result with proper structure
      const result = {
        question,
        response: responseText,
        analysis,
        timestamp: new Date(),
        questionIndex: this.currentIndex
      };

      this.results.push(result);

      // Send analysis feedback with question index
      this.sendMessage({ 
        type: "analysis", 
        analysis, 
        questionIndex: this.currentIndex 
      });

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
      console.log("Completing interview with results:", this.results.length);
      
      // Ensure we have valid data structure for final report
      if (this.results.length === 0) {
        throw new Error("No results to analyze");
      }

      // Log the structure being sent to summarizeOverallFeedback
      console.log("Results structure:", JSON.stringify(this.results, null, 2));

      const finalReport = await summarizeOverallFeedback(this.results);
      console.log("Final report generated:", finalReport);

      this.interviewData.results = this.results;
      this.interviewData.status = "completed";
      this.interviewData.finalReport = finalReport;
      this.interviewData.completedAt = new Date();
      await this.interviewData.save();

      // Update moderator skills based on AI feedback
      const user = await User.findById(this.userId);
      if (user && user.role === "moderator" && finalReport.averageScore) {
        const newProficiency = finalReport.averageScore; // Use averageScore as base proficiency

        // Combine key strengths and areas for improvement as potential skills
        const potentialSkills = [
          ...(finalReport.keyStrengths || []),
          ...(finalReport.areasForImprovement || [])
        ];

        for (const skillName of potentialSkills) {
          const existingSkillIndex = user.skills.findIndex(s => s.name.toLowerCase() === skillName.toLowerCase());

          if (existingSkillIndex > -1) {
            // Update existing skill proficiency
            user.skills[existingSkillIndex].proficiency = Math.min(100, Math.max(1, newProficiency));
          } else {
            // Add new skill
            user.skills.push({
              name: skillName,
              proficiency: Math.min(100, Math.max(1, newProficiency))
            });
          }
        }
        await user.save();
        console.log(`Moderator ${user.email} skills updated based on interview feedback.`);
      }

      this.sendMessage({ type: "finalReport", report: finalReport });
      this.sendMessage({ type: "end", message: "Interview completed successfully!" });

      // Close after delay
      setTimeout(() => {
        this.connectionActive = false;
        this.ws.close();
      }, 1000);
    } catch (err) {
      console.error("Error completing interview:", err);
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        resultsLength: this.results.length
      });
      
      // Send a basic completion message even if final report fails
      this.sendMessage({ 
        type: "finalReport", 
        report: {
          recommendation: "Interview completed but final analysis failed. Please review responses manually.",
          error: err.message
        }
      });
      this.sendMessage({ type: "end", message: "Interview completed with analysis errors." });
      
      // Still close the connection
      setTimeout(() => {
        this.connectionActive = false;
        this.ws.close();
      }, 1000);
    }
  }
}
