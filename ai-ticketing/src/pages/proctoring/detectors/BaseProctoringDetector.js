import { log, warn, error } from '../../../utils/logger.js';

/**
 * Base class for all proctoring detectors
 * Provides common functionality like violation cooldown and WebSocket communication
 */
export class BaseProctoringDetector {
  constructor(name, interviewWS, videoElement, options = {}) {
    this.name = name;
    this.interviewWS = interviewWS;
    this.videoElement = videoElement;
    this.options = {
      checkInterval: 5000, // Default: check every 5 seconds
      cooldownPeriod: 10000, // Default: 10 second cooldown between same violations
      initialDelay: 3000, // Default: wait 3 seconds before starting
      ...options
    };
    
    this.detector = null;
    this.intervalId = null;
    this.lastViolation = { type: null, time: 0 };
    this.isRunning = false;
  }

  /**
   * Send violation to backend via WebSocket
   * Violations are sent silently - user is NOT notified
   */
  sendViolation(violationType, metadata = {}) {
    const now = Date.now();
    
    // Cooldown: Don't send same violation within cooldown period
    if (this.lastViolation.type === violationType && 
        now - this.lastViolation.time < this.options.cooldownPeriod) {
      return;
    }

    if (this.interviewWS?.readyState === WebSocket.OPEN) {
      log(` [${this.name}] Violation: ${violationType}`, metadata);
      
      // Send violation silently to backend (user won't see this)
      this.interviewWS.send(
        JSON.stringify({
          type: 'proctoring_violation',
          violationType,
          detectorName: this.name,
          timestamp: now,
          metadata,
          silent: true // Flag to indicate user should not be notified
        })
      );
      
      this.lastViolation = { type: violationType, time: now };
    }
  }

  /**
   * Reset violation cooldown (call when everything is normal)
   */
  resetViolation() {
    this.lastViolation = { type: null, time: 0 };
  }

  /**
   * Wait for video to be ready
   */
  async waitForVideo() {
    if (this.videoElement.readyState >= 2) {
      return;
    }

    log(` [${this.name}] Waiting for video to load...`);
    await new Promise((resolve) => {
      this.videoElement.onloadeddata = () => {
        log(` [${this.name}] Video loaded`);
        resolve();
      };
    });
  }

  /**
   * Initialize the detector (must be implemented by subclasses)
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Perform detection (must be implemented by subclasses)
   */
  async detect() {
    throw new Error('detect() must be implemented by subclass');
  }

  /**
   * Start the detection loop
   */
  async start() {
    if (this.isRunning) {
      warn(` [${this.name}] Already running`);
      return;
    }

    try {
      log(` [${this.name}] Starting proctoring...`);

      // Wait for video
      log(`📹 [${this.name}] Waiting for video...`);
      await this.waitForVideo();
      log(` [${this.name}] Video ready`);

      // Initialize detector
      log(`🔧 [${this.name}] Initializing detector...`);
      await this.initialize();
      log(` [${this.name}] Detector initialized`);

      // Initial delay before starting detection
      if (this.options.initialDelay > 0) {
        log(` [${this.name}] Waiting ${this.options.initialDelay}ms before starting detection...`);
        await new Promise(resolve => setTimeout(resolve, this.options.initialDelay));
      }

      // Start detection loop
      log(`🔁 [${this.name}] Starting detection loop (interval: ${this.options.checkInterval}ms)`);
      this.isRunning = true;
      
      this.intervalId = setInterval(async () => {
        if (!this.detector || !this.videoElement) {
          warn(` [${this.name}] Detector or video not available`);
          return;
        }

        try {
          await this.detect();
        } catch (err) {
          error(` [${this.name}] Detection error:`, err);
        }
      }, this.options.checkInterval);

      log(` [${this.name}] Detection loop started successfully`);

    } catch (err) {
      error(` [${this.name}] Setup error:`, err);
      error(`Error message:`, err.message);
      error(`Error stack:`, err.stack);
      throw err;
    }
  }

  /**
   * Stop the detection loop
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.detector = null;
    this.isRunning = false;
    log(`🛑 [${this.name}] Stopped`);
  }
}
