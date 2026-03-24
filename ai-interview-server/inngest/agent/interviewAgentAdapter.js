import { logger } from "../../utils/logger.js";
import { interviewAgent, interviewEvaluationAgent, combinedAgent, batchQuestionAgent, batchEvaluationAgent } from "./interviewAgent.js";

export class InterviewAgentAdapter {
  constructor(context) {
    this.context = context; 
    this.history = [];
    this.mode = "batch"; 
    this.preGeneratedQuestions = [];
    this.currentQuestionIndex = 0;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  //  Helpers

  buildContextText() {
    const { role, level, techstack, focus, maxQuestions } = this.context;
    return `
INTERVIEW CONTEXT:
- Role: ${role}
- Experience level: ${level}
- Tech stack: ${Array.isArray(techstack) ? techstack.join(", ") : techstack}
- Interview focus: ${focus}
- Maximum number of questions: ${maxQuestions}
`.trim();
  }

  extractJson(agentResult) {
    const text = agentResult?.output?.[0]?.content;
    if (!text) {
      logger.error(" No content in agent result");
      return null;
    }

    try {
      let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        logger.log(" Successfully parsed JSON response");
        return parsed;
      }
      const parsed = JSON.parse(cleaned.trim());
      logger.log(" Successfully parsed JSON response");
      return parsed;
    } catch (err) {
      logger.error(" JSON parse failed:", err.message);
      logger.error("Raw text:", text?.substring(0, 200));
      return null;
    }
  }

  async retryWithBackoff(fn, context) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.log(` Attempt ${attempt}/${this.maxRetries}: ${context}`);
        const result = await fn();
        return result;
      } catch (err) {
        logger.error(` Attempt ${attempt} failed:`, err.message);
        
        if (attempt === this.maxRetries) {
          throw new Error(`Failed after ${this.maxRetries} attempts: ${err.message}`);
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        logger.log(` Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  //BATCH MODE: Generate all questions upfront
 
  async generateAllQuestions() {
    const { level, maxQuestions, role, techstack } = this.context;
    
    logger.log(`📝 Generating ${maxQuestions} ${level}-level questions for ${role}...`);
    
    const generateFn = async () => {
      const res = await batchQuestionAgent.run({
        input: {
          instruction: `
${this.buildContextText()}

IMPORTANT: The candidate is applying for a ${role} position at the ${level} experience level.

Generate exactly ${maxQuestions} high-quality interview questions that:
1. Match the ${level} experience level precisely
2. Are specific to ${role} and ${Array.isArray(techstack) ? techstack.join(", ") : techstack}
3. Cover different aspects: technical depth, problem-solving, experience, collaboration
4. Are clear, specific, and open-ended
5. Progress in complexity within the ${level} level

Return STRICT JSON only:
{
  "questions": [
    {
      "question": "Clear, specific question text",
      "focus": "technical|problem-solving|experience|soft-skills",
      "expectedDepth": "basic|intermediate|advanced"
    }
  ]
}
        `.trim(),
        },
      });

      const result = this.extractJson(res);
      
      if (!result?.questions || !Array.isArray(result.questions)) {
        throw new Error("Invalid response format: missing questions array");
      }

      if (result.questions.length !== maxQuestions) {
        logger.warn(` Expected ${maxQuestions} questions, got ${result.questions.length}`);
      }

      return result;
    };

    const result = await this.retryWithBackoff(generateFn, "Generating questions");
    this.preGeneratedQuestions = result.questions;
    logger.log(` Generated ${this.preGeneratedQuestions.length} questions successfully`);
    // Log first question as preview
    if (this.preGeneratedQuestions.length > 0) {
      logger.log(` First question: ${this.preGeneratedQuestions[0].question.substring(0, 80)}...`);
    }
    return this.preGeneratedQuestions;
  }

  getNextQuestion() {
    if (this.currentQuestionIndex >= this.preGeneratedQuestions.length) {
      logger.log(" All questions have been asked");
      return null;
    }
    
    const question = this.preGeneratedQuestions[this.currentQuestionIndex];
    this.currentQuestionIndex++;
    
    logger.log(`📤 Sending question ${this.currentQuestionIndex}/${this.preGeneratedQuestions.length}`);
    
    return {
      question: question.question,
      focus: question.focus,
      expectedDepth: question.expectedDepth,
      questionNumber: this.currentQuestionIndex
    };
  }

  // Interview flow (BATCH MODE)

  async generateOpeningQuestion() {
    try {
      // Generate all questions upfront
      await this.generateAllQuestions();
      
      // Return first question
      const firstQ = this.getNextQuestion();
      
      if (!firstQ) {
        throw new Error("No questions generated");
      }
      
      return {
        question: firstQ.question,
        reason: `Starting interview with ${firstQ.focus} question (${firstQ.expectedDepth} depth)`,
        shouldEnd: false
      };
    } catch (err) {
      logger.error(" Failed to generate opening question:", err);
      throw new Error(`Interview initialization failed: ${err.message}`);
    }
  }

  // Store answer (NO API call)

  async processAnswer({ question, answer }) {
    logger.log(`📥 Storing answer ${this.history.length + 1} (${answer.length} characters)`);
    
    // Validate answer
    if (!answer || answer.trim().length < 10) {
      logger.warn(" Answer is very short");
    }
    
    // Just store the answer, no AI evaluation yet
    this.history.push({
      question,
      answer: answer.trim(),
      timestamp: new Date(),
      questionNumber: this.history.length + 1
    });

    // Get next question from pre-generated list
    const nextQ = this.getNextQuestion();
    
    if (!nextQ) {
      // No more questions, end interview
      logger.log(" All questions answered, preparing for final evaluation");
      return {
        evaluation: null, // Will evaluate all at the end
        decision: {
          shouldEnd: true,
          question: null,
          reason: "All questions completed"
        }
      };
    }
    // Return next question without evaluation
    return {
      evaluation: null, // Will evaluate all at the end
      decision: {
        shouldEnd: false,
        question: nextQ.question,
        reason: `Next ${nextQ.focus} question (${nextQ.expectedDepth} depth)`
      }
    };
  }
 // Batch evaluation at the end 

  async summarizeInterview() {
    logger.log(`🎯 Evaluating complete interview (${this.history.length} Q&A pairs)...`);
    
    const evaluateFn = async () => {
      const res = await batchEvaluationAgent.run({
        input: {
          instruction: `
${this.buildContextText()}

COMPLETE INTERVIEW TRANSCRIPT:
${JSON.stringify(this.history, null, 2)}

Evaluate the entire interview comprehensively and provide detailed, actionable feedback.

Consider:
- The candidate's experience level (${this.context.level})
- Technical depth appropriate for ${this.context.role}
- Communication clarity
- Problem-solving approach
- Growth potential

CRITICAL: You MUST include ALL required fields:
- overallScore (number)
- overallSummary (detailed string)
- strengths (array of 3 specific strings with examples)
- areasForImprovement (array of 2 specific strings with actionable advice)
- technicalScore (number)
- problemSolvingScore (number)
- communicationScore (number)
- questionEvaluations (array with evaluation for EACH question)
- recommendation (one of: "Strong Hire", "Hire", "Maybe", "Pass")
- recommendationReason (detailed string explaining why)
- nextSteps (specific actionable string)

Return STRICT JSON only with ALL fields populated.
        `.trim(),
        },
      });

      const result = this.extractJson(res);
      
      if (!result) {
        throw new Error("Failed to parse evaluation response");
      }

      // Validate required fields
      const requiredFields = [
        'overallScore', 'overallSummary', 'strengths', 'areasForImprovement',
        'technicalScore', 'problemSolvingScore', 'communicationScore',
        'questionEvaluations', 'recommendation', 'recommendationReason', 'nextSteps'
      ];

      const missingFields = requiredFields.filter(field => !(field in result));
      
      if (missingFields.length > 0) {
        logger.warn(` Missing fields in evaluation: ${missingFields.join(', ')}`);
        logger.warn('Raw result:', JSON.stringify(result, null, 2));
      }

      // Validate data types
      if (typeof result.overallScore !== 'number') {
        logger.warn(' overallScore is not a number:', result.overallScore);
      }
      if (!Array.isArray(result.strengths)) {
        logger.warn(' strengths is not an array:', result.strengths);
      }
      if (!Array.isArray(result.areasForImprovement)) {
        logger.warn(' areasForImprovement is not an array:', result.areasForImprovement);
      }
      if (!Array.isArray(result.questionEvaluations)) {
        logger.warn(' questionEvaluations is not an array:', result.questionEvaluations);
      }

      logger.log(' Evaluation validation passed');
      logger.log(` Scores - Overall: ${result.overallScore}, Technical: ${result.technicalScore}, Problem-Solving: ${result.problemSolvingScore}, Communication: ${result.communicationScore}`);
      logger.log(` Strengths: ${result.strengths?.length || 0} items`);
      logger.log(` Areas for improvement: ${result.areasForImprovement?.length || 0} items`);

      return result;
    };

    const result = await this.retryWithBackoff(evaluateFn, "Evaluating interview");
    
    logger.log(` Evaluation complete - Overall score: ${result.overallScore}/100`);
    logger.log(` Recommendation: ${result.recommendation}`);
    logger.log(` Reason: ${result.recommendationReason?.substring(0, 100)}...`);
    
    return result;
  }
}
