export class InterviewSession{
    constructor(){
        this.currentQuestion = null;
        this.currentQuestionId = null; //  Track question ID for deduplication
        this.questionCount = 0;
        this.results = [];

            // Control flags
    this.isProcessing = false;
    this.isInterviewReady = false;

        this.earlyResponses = [];
        // Track processed responses to prevent duplicates
        this.processedResponseIds = new Set();

    }

     startNewQuestion(question) {
    this.currentQuestion = question;
    this.questionCount++;
    this.currentQuestionId = `q${this.questionCount}_${Date.now()}`;
  }

  addResult(result) {
    this.results.push(result);
  }

  markReady() {
    this.isInterviewReady = true;
  }

  markProcessing(value) {
    this.isProcessing = value;
  }

  bufferEarlyResponse(data) {
    this.earlyResponses.push(data);
  }

  hasEarlyResponses() {
    return this.earlyResponses.length > 0;
  }

  popEarlyResponse() {
    return this.earlyResponses.shift();
  }

  isDuplicateResponse(responseText) {
    const id = `${this.currentQuestionId}_${responseText.substring(0, 50)}`;
    if (this.processedResponseIds.has(id)) {
      return true;
    }
    this.processedResponseIds.add(id);
    return false;
  }
}

