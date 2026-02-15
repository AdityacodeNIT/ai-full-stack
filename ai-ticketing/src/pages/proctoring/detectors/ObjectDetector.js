import { BaseProctoringDetector } from './BaseProctoringDetector.js';
import { log, error } from '../../../utils/logger.js';
import { modelCache } from './ModelCache.js';

/**
 * Object Detection Proctoring
 * Detects: phones, books, other prohibited objects
 */
export class ObjectDetector extends BaseProctoringDetector {
  constructor(interviewWS, videoElement, options = {}) {
    super('ObjectDetector', interviewWS, videoElement, {
      checkInterval: 5000, // Check every 5 seconds
      cooldownPeriod: 10000, // 10 second cooldown
      initialDelay: 3000, // Wait 3 seconds before starting
      confidenceThreshold: 0.6, // 60% minimum confidence for violations
      prohibitedObjects: ['cell phone', 'book'], // Objects to detect
      ...options
    });
    log(`🏗️ [${this.name}] Constructor called with options:`, this.options);
  }

  async initialize() {
    try {
      log(`📦 [${this.name}] Initializing Object Detection...`);
      
      // Use cached model if available
      this.detector = await modelCache.getCocoSsdModel();
      
      log(` [${this.name}] Object detector ready`);
      log(`🎯 [${this.name}] Monitoring for: ${this.options.prohibitedObjects.join(', ')}`);
    } catch (err) {
      error(` [${this.name}] Initialization error:`, err);
      error(`Error details:`, err.message, err.stack);
      throw err;
    }
  }

  async detect() {
    const predictions = await this.detector.detect(this.videoElement);
    
    // Log ALL detected objects for testing/debugging
    if (predictions.length > 0) {
      const allObjects = predictions
        .filter(pred => pred.score >= this.options.confidenceThreshold)
        .map(pred => `${pred.class} (${Math.round(pred.score * 100)}%)`)
        .join(', ');
      
      log(`🔍 [${this.name}] All objects detected: ${allObjects}`);
    } else {
      log(`👁️ [${this.name}] No objects detected in frame`);
    }
    
    // Filter for prohibited objects with sufficient confidence
    const prohibitedDetections = predictions.filter(pred => 
      this.options.prohibitedObjects.includes(pred.class) && 
      pred.score >= this.options.confidenceThreshold
    );

    if (prohibitedDetections.length > 0) {
      // Group by object type
      const detectedObjects = prohibitedDetections.reduce((acc, pred) => {
        acc[pred.class] = (acc[pred.class] || 0) + 1;
        return acc;
      }, {});

      const objectList = Object.entries(detectedObjects)
        .map(([obj, count]) => `${count}x ${obj}`)
        .join(', ');

      log(` [${this.name}] PROHIBITED objects detected: ${objectList}`);

      // Send violation for each type of prohibited object
      for (const detection of prohibitedDetections) {
        const violationType = `prohibited_object_${detection.class.replace(/\s+/g, '_')}`;
        
        this.sendViolation(violationType, {
          object: detection.class,
          confidence: detection.score,
          bbox: detection.bbox,
          message: `Prohibited object detected: ${detection.class} (${Math.round(detection.score * 100)}% confidence)`
        });
      }
    } else {
      // No prohibited objects - reset cooldown
      this.resetViolation();
      log(` [${this.name}] No prohibited objects detected`);
    }
  }
}
