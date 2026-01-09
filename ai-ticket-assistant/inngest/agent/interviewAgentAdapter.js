import { interviewAgent, interviewEvaluationAgent } from "./interviewAgent.js";

export class InterviewAgentAdapter {
  constructor(context) {
    this.context = context; // role, level, techstack, focus, maxQuestions
    this.history = [];
  }

  /* ─────────────────────────────
     Helpers
  ───────────────────────────── */

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
    if (!text) return null;

    try {
      return JSON.parse(
        text.replace(/```json|```/g, "").trim()
      );
    } catch (err) {
      console.error("JSON parse failed:", text);
      return null;
    }
  }

  /* ─────────────────────────────
     Interview flow
  ───────────────────────────── */

  async generateOpeningQuestion() {
    const res = await interviewAgent.run({
      input: {
        instruction: `
${this.buildContextText()}

Ask the first interview question.

Return STRICT JSON only:
{
  "question": string,
  "reason": string,
  "shouldEnd": boolean
}
        `.trim(),
      },
    });

    return this.extractJson(res);
  }

  async processAnswer({ question, answer }) {
    console.log("Processing answer for question:", question,answer);
    // 1️⃣ Evaluate answer
    const evalRes = await interviewEvaluationAgent.run({
      input: {
        instruction: `
QUESTION:
${question}

ANSWER:
${answer}

Evaluate the answer.

Return STRICT JSON only.
        `.trim(),
      },
    });

    const evaluation = this.extractJson(evalRes);

    this.history.push({
      question,
      answer,
      evaluation,
    });

    // 2️⃣ Decide next question
    const nextRes = await interviewAgent.run({
      input: {
        instruction: `
${this.buildContextText()}

INTERVIEW HISTORY:
${JSON.stringify(this.history, null, 2)}

Ask the next best interview question.

Return STRICT JSON only:
{
  "question": string | null,
  "reason": string,
  "shouldEnd": boolean
}
        `.trim(),
      },
    });

    const decision = this.extractJson(nextRes);

    return { evaluation, decision };
  }

  async summarizeInterview() {
    const res = await interviewAgent.run({
      input: {
        instruction: `
${this.buildContextText()}

INTERVIEW HISTORY:
${JSON.stringify(this.history, null, 2)}

Summarize the interview and assess the candidate.

Return STRICT JSON only.
        `.trim(),
      },
    });

    return this.extractJson(res);
  }
}
