import Interview from "../../models/interview.js";

export class InterviewService{
    async findInterviewById(interviewId){
        return await Interview.findById(interviewId)
    }

   async startInterview(interview) {
    interview.status = "in-progress";
    interview.startedAt = new Date();
    await interview.save();
    return interview;
  }

  calculateDuration(interview) {
    if (!interview.startedAt) return 0;
    return Math.round(
      (new Date() - interview.startedAt) / 1000 / 60
    );
  }

  async completeInterview(interview, results, finalReport, violations) {
    interview.results = results;
    interview.finalReport = finalReport;
    interview.proctoringViolations = violations;
    interview.status = "completed";
    interview.completedAt = new Date();
    interview.duration = this.calculateDuration(interview);
    await interview.save();
    return interview;
  }

  async failInterview(interview, results, errorMessage) {
    interview.status = "failed";
    interview.results = results;
    interview.error = errorMessage;
    await interview.save();
  }
  
}