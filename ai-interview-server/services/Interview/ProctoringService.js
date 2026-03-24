import { logger } from "../../utils/logger.js";

export class ProctoringService{

    constructor(){
        this.violations=[];
    }

    recordViolation(data,questionNumber){
           const violation = {
        type: data.violationType,
        detector: data.detectorName || 'Unknown',
        timestamp: data.timestamp || Date.now(),
        questionNumber: this.questionCount,
        metadata: data.metadata || {}, // Store confidence, object, bbox, etc.
        silent: data.silent !== false // Default to silent (user not notified)
      };
      this.violations.push(violation);

         if (violation.metadata.object) {
              const confidence = violation.metadata.confidence 
                ? `${Math.round(violation.metadata.confidence * 100)}%` 
                : 'N/A';
              logger.log(` [${violation.detector}] ${violation.type}: ${violation.metadata.object} (${confidence} confidence) - Total violations: ${this.proctoringViolations.length}`);
            } else {
              logger.log(` [${violation.detector}] ${violation.type} - Total violations: ${this.proctoringViolations.length}`);
            }
    }

     getViolations() {
    return this.violations;
  }

  logSummary() {
    logger.log("\n" + "=".repeat(60));
    logger.log("PROCTORING VIOLATIONS SUMMARY");
    logger.log("=".repeat(60));

    if (this.violations.length === 0) {
      logger.log("No violations detected - Clean interview");
    } else {
      logger.log(`Total violations: ${this.violations.length}`);

      this.violations.forEach((v, index) => {
        const time = new Date(v.timestamp).toLocaleTimeString();
        logger.log(
          `${index + 1}. [Q${v.questionNumber}] ${v.type} at ${time}`
        );
      });

      const breakdown = {};
      this.violations.forEach(v => {
        breakdown[v.type] = (breakdown[v.type] || 0) + 1;
      });

      logger.log("\nBreakdown:");
      Object.entries(breakdown).forEach(([type, count]) => {
        logger.log(`- ${type}: ${count}x`);
      });
    }

    logger.log("=".repeat(60) + "\n");
  }
}