import { useEffect, useRef, useState } from 'react';
import { FaceDetector } from './detectors/FaceDetector.js';
import { ObjectDetector } from './detectors/ObjectDetector.js';
import { log, error } from '../../utils/logger.js';

/**
 * Unified Proctoring Manager
 * Manages multiple detection systems (face, object, etc.)
 */
const ProctoringManager = ({ 
  interviewWS, 
  videoElement,
  enabledDetectors = ['face', 'object'], // Which detectors to enable
  detectorOptions = {} // Custom options for each detector
}) => {
  const detectorsRef = useRef([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState({});
  const [detectionError, setDetectionError] = useState(null);

  log('🔍 ProctoringManager mounted', { 
    hasWS: !!interviewWS, 
    hasVideo: !!videoElement,
    videoReady: videoElement?.readyState,
    enabledDetectors
  });

  useEffect(() => {
    if (!videoElement) {
      error(' No video element provided to ProctoringManager');
      return;
    }

    if (!interviewWS) {
      error(' No WebSocket provided to ProctoringManager');
      return;
    }

    const startProctoring = async () => {
      try {
        log(' Starting proctoring system...');
        log('📹 Video element state:', {
          readyState: videoElement.readyState,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          paused: videoElement.paused
        });

        const detectors = [];

        // Initialize Face Detector
        if (enabledDetectors.includes('face')) {
          setLoadingStatus(prev => ({ ...prev, face: 'loading' }));
          try {
            const faceDetector = new FaceDetector(
              interviewWS, 
              videoElement,
              detectorOptions.face || {}
            );
            await faceDetector.start();
            detectors.push(faceDetector);
            setLoadingStatus(prev => ({ ...prev, face: 'ready' }));
            log(' Face detector started');
          } catch (err) {
            error(' Failed to start face detector:', err);
            setLoadingStatus(prev => ({ ...prev, face: 'error' }));
          }
        }

        // Initialize Object Detector
        if (enabledDetectors.includes('object')) {
          setLoadingStatus(prev => ({ ...prev, object: 'loading' }));
          log('🔧 Attempting to initialize Object Detector...');
          try {
            const objectDetector = new ObjectDetector(
              interviewWS, 
              videoElement,
              detectorOptions.object || {}
            );
            log(' ObjectDetector instance created, starting...');
            await objectDetector.start();
            detectors.push(objectDetector);
            setLoadingStatus(prev => ({ ...prev, object: 'ready' }));
            log(' Object detector started successfully');
          } catch (err) {
            error(' Failed to start object detector:', err);
            error('Error stack:', err.stack);
            setLoadingStatus(prev => ({ ...prev, object: 'error' }));
          }
        }

        detectorsRef.current = detectors;
        setIsLoading(false);
        log(` Proctoring system started with ${detectors.length} detector(s)`);

      } catch (err) {
        error(' Proctoring system setup error:', err);
        setDetectionError(err.message);
        setIsLoading(false);
      }
    };

    startProctoring();

    // Cleanup on unmount
    return () => {
      log('🧹 Cleaning up proctoring system...');
      detectorsRef.current.forEach(detector => {
        try {
          detector.stop();
        } catch (err) {
          error('Error stopping detector:', err);
        }
      });
      detectorsRef.current = [];
    };
  }, []); // Empty deps - only run once on mount

  // No UI rendering - completely silent
  return null;
};

export default ProctoringManager;
