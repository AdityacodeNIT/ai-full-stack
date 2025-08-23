// analyzeresponse.js
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const analyzeResponse = async (responseText, question) => {
  console.log("📨 Analyzing response:", responseText.substring(0, 100) + "...");
  
  if (!responseText || responseText.trim().length === 0) {
    throw new Error('Response text is empty');
  }

  if (!question) {
    throw new Error('Question is required for analysis');
  }

  const prompt = `
Analyze this interview answer for the question: "${question}"

Answer: "${responseText}"

Provide detailed feedback on:
- Confidence level (High/Medium/Low)
- Communication clarity (High/Medium/Low)  
- Leadership qualities shown (High/Medium/Low)
- Technical understanding demonstrated (High/Medium/Low)
- Overall impression

Respond in valid JSON format:
{
  "confidence": "High/Medium/Low",
  "clarity": "High/Medium/Low", 
  "leadership": "High/Medium/Low",
  "technicalUnderstanding": "High/Medium/Low",
  "summary": "2-3 sentence summary of strengths and areas for improvement",
  "score": 85,
  "recommendations": ["specific suggestion 1", "specific suggestion 2"]
}
  `;

  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      prompt,
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      maxTokens: 500,
      temperature: 0.3
    });

    // Clean and parse response
    const cleanText = text
      .replace(/```json?/g, '')
      .replace(/\n?```/g, '')
      .trim();

    const analysis = JSON.parse(cleanText);
    
    // Validate required fields
    const requiredFields = ['confidence', 'clarity', 'leadership', 'technicalUnderstanding', 'summary'];
    const missingFields = requiredFields.filter(field => !analysis[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing fields in analysis: ${missingFields.join(', ')}`);
    }

    return analysis;

  } catch (error) {
    console.error('Error in analyzeResponse:', error);
    
    // Fallback analysis
    return {
      confidence: 'Medium',
      clarity: 'Medium', 
      leadership: 'Medium',
      technicalUnderstanding: 'Medium',
      summary: 'Unable to generate detailed analysis. Please review the response manually.',
      score: 70,
      recommendations: ['Provide more specific examples', 'Elaborate on technical details'],
      error: 'Analysis generation failed'
    };
  }
};

export const summarizeOverallFeedback = async (allAnalyses) => {
  if (!allAnalyses || allAnalyses.length === 0) {
    throw new Error('No analyses provided for summarization');
  }

  const summaryPrompt = `
You are analyzing complete interview data to create a comprehensive final report.

Interview Data:
${JSON.stringify(allAnalyses, null, 2)}

Generate a detailed final interview assessment with:

1. Per-question breakdown with candidate responses and feedback
2. Overall ratings across all dimensions (High/Medium/Low)
3. Final recommendation (2-3 sentences)
4. Proficiency level assessment (Beginner/Intermediate/Advanced)
5. Ideal answer examples for improvement

Return in this exact JSON format:
{
  "perQuestion": [
    {
      "question": "Original question text",
      "yourResponse": "Candidate's actual answer", 
      "summary": "Brief feedback on this specific answer",
      "idealAnswer": "Example of what a strong answer would include"
    }
  ],
  "overallRatings": {
    "confidence": "High/Medium/Low",
    "clarity": "High/Medium/Low", 
    "leadership": "High/Medium/Low",
    "technicalUnderstanding": "High/Medium/Low"
  },
  "averageScore": 78,
  "recommendation": "Overall hiring recommendation with specific reasoning",
  "proficiencyLevel": "Intermediate",
  "keyStrengths": ["strength 1", "strength 2"],
  "areasForImprovement": ["area 1", "area 2"]
}
`;

  try {
    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: summaryPrompt,
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      maxTokens: 1000,
      temperature: 0.2
    });

    console.log("Raw AI response:", text);

    const cleanText = text
      .replace(/```json?/g, '')
      .replace(/\n?```/g, '')
      .trim();

    const report = JSON.parse(cleanText);
    
    // Validate report structure
    if (!report.perQuestion || !report.overallRatings || !report.recommendation) {
      throw new Error('Invalid report structure generated');
    }

    return report;

  } catch (error) {
    console.error('Error generating final report:', error);
    
    // Generate fallback report
    const fallbackReport = {
      perQuestion: allAnalyses.map((analysis, index) => ({
        question: analysis.question,
        yourResponse: analysis.response,
        summary: analysis.analysis?.summary || 'Analysis unavailable',
        idealAnswer: 'Please review industry best practices for this type of question'
      })),
      overallRatings: {
        confidence: 'Medium',
        clarity: 'Medium',
        leadership: 'Medium', 
        technicalUnderstanding: 'Medium'
      },
      averageScore: 70,
      recommendation: 'Unable to generate detailed recommendation due to analysis error. Manual review recommended.',
      proficiencyLevel: 'Intermediate',
      keyStrengths: ['Completed the interview'],
      areasForImprovement: ['Review responses and seek feedback'],
      error: 'Report generation failed - using fallback'
    };

    return fallbackReport;
  }
};
