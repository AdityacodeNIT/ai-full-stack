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
  enabledDetectors = ['face', 'object'],
  detectorOptions = {}
}) => {
  const detectorsRef = useRef([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState({});
  const [detectionError, setDetectionError] = useState(null);
  
  // Capture props in refs to prevent remounting
  const videoRef = useRef(videoElement);
  const wsRef = useRef(interviewWS);
  const hasInitialized = useRef(false);

  // Update refs when props change
  videoRef.current = videoElement;
  wsRef.current = interviewWS;

  log(' ProctoringManager mounted', { 
    hasWS: !!interviewWS, 
    hasVideo: !!videoElement,
    videoReady: videoElement?.readyState,
    enabledDetectors
  });

  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) {
      log('✅ Already initialized, skipping');
      return;
    }

    // Wait for both video and WebSocket
    if (!videoRef.current || !wsRef.current) {
      log('⏳ Waiting for video and WebSocket...');
      return;
    }

    hasInitialized.current = true;
    log('✅ Video and WebSocket ready, starting proctoring...');

    const startProctoring = async () => {
      try {
        log('🚀 Starting proctoring system...');
        log(' Video element state:', {
          readyState: videoRef.current.readyState,
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight,
          paused: videoRef.current.paused
        });

        const detectors = [];

        // Initialize Face Detector
        if (enabledDetectors.includes('face')) {
          setLoadingStatus(prev => ({ ...prev, face: 'loading' }));
          try {
            const faceDetector = new FaceDetector(
              wsRef.current, 
              videoRef.current,
              detectorOptions.face || {}
            );
            await faceDetector.start();
            detectors.push(faceDetector);
            setLoadingStatus(prev => ({ ...prev, face: 'ready' }));
            log('✅ Face detector started');
          } catch (err) {
            error('❌ Failed to start face detector:', err);
            setLoadingStatus(prev => ({ ...prev, face: 'error' }));
          }
        }

        // Initialize Object Detector
        if (enabledDetectors.includes('object')) {
          setLoadingStatus(prev => ({ ...prev, object: 'loading' }));
          log(' Attempting to initialize Object Detector...');
          try {
            const objectDetector = new ObjectDetector(
              wsRef.current, 
              videoRef.current,
              detectorOptions.object || {}
            );
            log('✅ ObjectDetector instance created, starting...');
            await objectDetector.start();
            detectors.push(objectDetector);
            setLoadingStatus(prev => ({ ...prev, object: 'ready' }));
            log('✅ Object detector started successfully');
          } catch (err) {
            error('❌ Failed to start object detector:', err);
            error('Error stack:', err.stack);
            setLoadingStatus(prev => ({ ...prev, object: 'error' }));
          }
        }

        detectorsRef.current = detectors;
        setIsLoading(false);
        log(`✅ Proctoring system started with ${detectors.length} detector(s)`);

      } catch (err) {
        error('❌ Proctoring system setup error:', err);
        setDetectionError(err.message);
        setIsLoading(false);
      }
    };

    startProctoring();

    // Cleanup ONLY on unmount
    return () => {
      log('🧹 Cleaning up proctoring system (component unmounting)...');
      detectorsRef.current.forEach(detector => {
        try {
          detector.stop();
        } catch (err) {
          error('Error stopping detector:', err);
        }
      });
      detectorsRef.current = [];
      hasInitialized.current = false;
    };
  }, []); // Empty deps - run once and stay mounted

  // No UI rendering - completely silent
  return null;
};

export default ProctoringManager;
