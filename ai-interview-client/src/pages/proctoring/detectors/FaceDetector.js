import { BaseProctoringDetector } from './BaseProctoringDetector.js';
import { log } from '../../../utils/logger.js';
import { modelCache } from './ModelCache.js';

/**
 * Face Detection Proctoring
 * Detects: no face, multiple faces
 */
export class FaceDetector extends BaseProctoringDetector {
  constructor(interviewWS, videoElement, options = {}) {
    super('FaceDetector', interviewWS, videoElement, {
      checkInterval: 5000, // Check every 5 seconds
      cooldownPeriod: 10000, // 10 second cooldown
      initialDelay: 3000, // Wait 3 seconds before starting
      maxFaces: 2,
      ...options
    });
  }

  async initialize() {
    log(`📦 [${this.name}] Initializing Face Detection...`);
    
    // Use cached model if available
    this.detector = await modelCache.getFaceDetectionModel();
    
    log(` [${this.name}] Face detector ready`);
  }

  async detect() {
    const faces = await this.detector.estimateFaces(this.videoElement);
    log(`👤 [${this.name}] Faces detected: ${faces.length}`);

    if (faces.length === 0) {
      this.sendViolation('no_face', { 
        message: 'No face detected in frame' 
      });
    } else if (faces.length > 1) {
      this.sendViolation('multiple_faces', { 
        count: faces.length,
        message: `${faces.length} faces detected` 
      });
    } else {
      // Face detected properly - reset cooldown
      this.resetViolation();
    }
  }
}
