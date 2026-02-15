import { log, error } from '../../../utils/logger.js';

/**
 * Singleton cache for TensorFlow models
 * Models are loaded once and reused across all interviews
 */
class ModelCache {
  constructor() {
    this.models = {
      tensorflow: null,
      faceDetection: null,
      cocoSsd: null
    };
    this.loading = {
      tensorflow: false,
      faceDetection: false,
      cocoSsd: false
    };
    this.loadPromises = {};
  }

  /**
   * Get or load TensorFlow.js
   */
  async getTensorFlow() {
    if (this.models.tensorflow) {
      log(' [ModelCache] TensorFlow.js already loaded (cached)');
      return this.models.tensorflow;
    }

    // If already loading, wait for existing promise
    if (this.loading.tensorflow) {
      log(' [ModelCache] TensorFlow.js loading in progress, waiting...');
      return this.loadPromises.tensorflow;
    }

    this.loading.tensorflow = true;
    log('📦 [ModelCache] Loading TensorFlow.js for the first time...');

    this.loadPromises.tensorflow = (async () => {
      try {
        const tf = await import('@tensorflow/tfjs');
        await tf.ready();
        this.models.tensorflow = tf;
        log(' [ModelCache] TensorFlow.js loaded and cached');
        return tf;
      } catch (err) {
        error(' [ModelCache] Failed to load TensorFlow.js:', err);
        throw err;
      } finally {
        this.loading.tensorflow = false;
      }
    })();

    return this.loadPromises.tensorflow;
  }

  /**
   * Get or load Face Detection model
   */
  async getFaceDetectionModel() {
    if (this.models.faceDetection) {
      log(' [ModelCache] Face Detection model already loaded (cached)');
      return this.models.faceDetection;
    }

    if (this.loading.faceDetection) {
      log(' [ModelCache] Face Detection model loading in progress, waiting...');
      return this.loadPromises.faceDetection;
    }

    this.loading.faceDetection = true;
    log('📦 [ModelCache] Loading Face Detection model for the first time...');

    this.loadPromises.faceDetection = (async () => {
      try {
        // Ensure TensorFlow is loaded first
        await this.getTensorFlow();

        const faceDetection = await import('@tensorflow-models/face-detection');
        const detector = await faceDetection.createDetector(
          faceDetection.SupportedModels.MediaPipeFaceDetector,
          {
            runtime: 'tfjs',
            maxFaces: 2,
          }
        );

        this.models.faceDetection = detector;
        log(' [ModelCache] Face Detection model loaded and cached');
        return detector;
      } catch (err) {
        error(' [ModelCache] Failed to load Face Detection model:', err);
        throw err;
      } finally {
        this.loading.faceDetection = false;
      }
    })();

    return this.loadPromises.faceDetection;
  }

  /**
   * Get or load COCO-SSD model
   */
  async getCocoSsdModel() {
    if (this.models.cocoSsd) {
      log(' [ModelCache] COCO-SSD model already loaded (cached)');
      return this.models.cocoSsd;
    }

    if (this.loading.cocoSsd) {
      log(' [ModelCache] COCO-SSD model loading in progress, waiting...');
      return this.loadPromises.cocoSsd;
    }

    this.loading.cocoSsd = true;
    log('📦 [ModelCache] Loading COCO-SSD model for the first time...');

    this.loadPromises.cocoSsd = (async () => {
      try {
        // Ensure TensorFlow is loaded first
        await this.getTensorFlow();

        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        const detector = await cocoSsd.load();

        this.models.cocoSsd = detector;
        log(' [ModelCache] COCO-SSD model loaded and cached');
        return detector;
      } catch (err) {
        error(' [ModelCache] Failed to load COCO-SSD model:', err);
        throw err;
      } finally {
        this.loading.cocoSsd = false;
      }
    })();

    return this.loadPromises.cocoSsd;
  }

  /**
   * Check if models are cached
   */
  isCached(modelName) {
    return this.models[modelName] !== null;
  }

  /**
   * Clear cache (for testing or memory management)
   */
  clearCache() {
    log('🧹 [ModelCache] Clearing model cache');
    this.models = {
      tensorflow: null,
      faceDetection: null,
      cocoSsd: null
    };
  }

  /**
   * Get cache status
   */
  getStatus() {
    return {
      tensorflow: this.models.tensorflow ? 'cached' : 'not loaded',
      faceDetection: this.models.faceDetection ? 'cached' : 'not loaded',
      cocoSsd: this.models.cocoSsd ? 'cached' : 'not loaded'
    };
  }
}

// Export singleton instance
export const modelCache = new ModelCache();
