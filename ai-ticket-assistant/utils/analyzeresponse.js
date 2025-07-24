import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const analyzeResponse = async (responseText) => {
  const prompt = `
  Analyze this interview answer:
  "${responseText}"

  Give feedback on:
  - Confidence
  - Communication clarity
  - Leadership
  - Technical understanding

  Respond in JSON like:
  {
    "confidence": "High",
    "clarity": "Moderate",
    "leadership": "Low",
    "technicalUnderstanding": "Good",
    "summary": "Clear but lacking depth in leadership."
  }
  `;

  const { text } = await generateText({
    model: google('gemini-1.5-flash'),
    prompt,
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
  });

  try {
    return JSON.parse(text);
  } catch (err) {
    return { summary: text, error: 'Could not parse detailed metrics' };
  }
};


export const summarizeOverallFeedback = async (allAnalyses) => {
  const summaryPrompt = `
You are given an array of interview questions, candidate responses, and AI-generated analysis.

Your task is to return a final interview report that includes:
1. A one-line summary for each question's answer.
2. An overall rating for:
   - Confidence (High/Medium/Low)
   - Clarity (High/Medium/Low)
   - Leadership (High/Medium/Low)
   - Technical Understanding (High/Medium/Low)
3. A final recommendation (1–2 lines).
4. A proficiency level: Beginner, Intermediate, or Advanced.
5. A model/ideal answer for each question to guide the candidate on how to improve.

Here is the data:
${JSON.stringify(allAnalyses, null, 2)}

Return the result in this JSON format:
{
  "perQuestion": [
    {
      "question": "Your original question here",
      "yourResponse": "Candidate's actual answer",
      "summary": "Brief AI feedback about this answer",
      "idealAnswer": "What a perfect answer might have included"
    },
    ...
  ],
  "confidence": "High",
  "clarity": "Medium",
  "leadership": "Low",
  "technicalUnderstanding": "High",
  "recommendation": "Try to elaborate on real-world examples and show impact.",
  "proficiencyLevel": "Intermediate"
}
`;

  const { text } = await generateText({
    model: google('gemini-1.5-flash'),
    prompt: summaryPrompt,
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
  });

  try {
    console.log(text);
    
    return JSON.parse(text);
  } catch (err) {
    return {
      error: "⚠️ Failed to parse the final report.",
      raw: text
    };
  }
};

