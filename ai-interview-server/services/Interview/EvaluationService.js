import { logger } from "../../utils/logger.js";

export class EvaluationService {
  constructor(agent) {
    this.agent = agent;
  }
async evaluateInterview(results) {
  const finalReport = await this.agent.summarizeInterview();

  if (!finalReport) {
    throw new Error("Unable to generate the final report");
  }

  if (
    finalReport?.questionEvaluations &&
    Array.isArray(finalReport.questionEvaluations)
  ) {
    finalReport.questionEvaluations.forEach((evalData, index) => {
      if (results[index]) {
        results[index].evaluation = {
          confidence: evalData.confidence,
          clarity: evalData.clarity,
          technicalUnderstanding: evalData.technicalUnderstanding,
          summary: evalData.summary,
          score: evalData.score,
        };
      }
    });

    logger.log(
      `Updated ${finalReport.questionEvaluations.length} individual evaluations`
    );
  }

  return {
    finalReport,
    updatedResults: results,
  };
}


  transformFinalReport(finalReport, interviewData) {
    return {
      ...finalReport,
      interviewId: interviewData._id,
      duration: interviewData.duration,
      completedAt: interviewData.completedAt,
    };
  }
}
