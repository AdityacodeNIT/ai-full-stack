// analyzeresponse.js
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const analyzeResponse = async (responseText, question) => {
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

    // More robust JSON cleaning
    let cleanText = text.trim();
    
    // Remove code block markers
    cleanText = cleanText.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
    
    // Find JSON boundaries
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      throw new Error('No valid JSON found in response');
    }
    
    cleanText = cleanText.substring(jsonStart, jsonEnd + 1);

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

  // Create structured data for the prompt
  const interviewData = allAnalyses.map((item, index) => ({
    questionNumber: index + 1,
    question: item.question,
    response: item.response,
    analysis: item.analysis
  }));

  const summaryPrompt = `
You are analyzing complete interview data to create a comprehensive final report.

Interview Data:
${JSON.stringify(interviewData, null, 2)}

Generate a detailed final interview assessment. Return ONLY valid JSON with this exact structure:
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
      maxTokens: 1500,
      temperature: 0.2
    });

    console.log("Raw AI response:", text);

    // More robust JSON extraction
    let cleanText = text.trim();
    
    // Remove code block markers
    cleanText = cleanText.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
    
    // Find JSON boundaries
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
      throw new Error('No valid JSON found in response');
    }
    
    cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
    
    // Additional cleanup for common JSON issues
    cleanText = cleanText
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/\n/g, ' ')     // Replace newlines with spaces
      .replace(/\s+/g, ' ');   // Normalize whitespace

    const report = JSON.parse(cleanText);
    
    // Validate report structure
    if (!report.perQuestion || !report.overallRatings || !report.recommendation) {
      throw new Error('Invalid report structure generated');
    }

    // Ensure perQuestion matches the number of analyses
    if (report.perQuestion.length !== allAnalyses.length) {
      console.warn('Mismatch between perQuestion length and analyses length');
    }

    return report;

  } catch (error) {
    console.error('Error generating final report:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    // Generate fallback report with actual data
    const fallbackReport = {
      perQuestion: allAnalyses.map((analysis, index) => ({
        question: analysis.question || `Question ${index + 1}`,
        yourResponse: analysis.response || 'Response unavailable',
        summary: analysis.analysis?.summary || 'Analysis unavailable',
        idealAnswer: 'Please review industry best practices for this type of question'
      })),
      overallRatings: {
        confidence: 'Medium',
        clarity: 'Medium',
        leadership: 'Medium', 
        technicalUnderstanding: 'Medium'
      },
      averageScore: allAnalyses.length > 0 ? 
        Math.round(allAnalyses.reduce((sum, a) => sum + (a.analysis?.score || 70), 0) / allAnalyses.length) : 70,
      recommendation: 'Unable to generate detailed recommendation due to analysis error. Manual review recommended.',
      proficiencyLevel: 'Intermediate',
      keyStrengths: ['Completed the interview'],
      areasForImprovement: ['Review responses and seek feedback'],
      error: 'Report generation failed - using fallback'
    };

    return fallbackReport;
  }
};