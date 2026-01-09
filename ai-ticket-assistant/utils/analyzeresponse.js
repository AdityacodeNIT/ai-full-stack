import { interviewEvaluationAgent } from "../inngest/agent/interviewAgent";

export const analyzeResponse = async (responseText, question) => {
  if (!responseText?.trim()) {
    throw new Error("Response text is empty");
  }
  if (!question) {
    throw new Error("Question is required");
  }

  try {
    const result = await interviewEvaluationAgent.run({
      input: {
        question,
        response: responseText,
      },
    });

    // 🔒 Robust JSON extraction (keep your safety logic)
    let cleanText = result.output.trim()
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```$/i, "");

    const start = cleanText.indexOf("{");
    const end = cleanText.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("Invalid JSON from agent");
    }

    cleanText = cleanText.slice(start, end + 1);

    const analysis = JSON.parse(cleanText);

    return analysis;

  } catch (error) {
    console.error("Agent analysis failed:", error);

    return {
      confidence: "Medium",
      clarity: "Medium",
      leadership: "Medium",
      technicalUnderstanding: "Medium",
      summary: "Unable to generate detailed analysis. Manual review recommended.",
      score: 70,
      recommendations: [
        "Provide more concrete examples",
        "Explain reasoning more clearly"
      ],
      error: "Evaluation agent failed"
    };
  }
};
