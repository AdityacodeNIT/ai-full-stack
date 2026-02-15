import { useEffect, useRef, useState } from 'react';
import { log, warn, error } from '../../utils/logger.js';

const FaceDetection = ({ interviewWS, videoElement }) => {
  const detectorRef = useRef(null);
  const intervalRef = useRef(null);
  const lastViolationRef = useRef({ type: null, time: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  log('🔍 FaceDetection mounted', { 
    hasWS: !!interviewWS, 
    hasVideo: !!videoElement,
    videoReady: videoElement?.readyState 
  });

  const sendViolation = (type) => {
    // Cooldown: Don't send same violation within 10 seconds
    const now = Date.now();
    if (lastViolationRef.current.type === type && 
        now - lastViolationRef.current.time < 10000) {
      return;
    }

    if (interviewWS?.readyState === WebSocket.OPEN) {
      log(` Face violation: ${type}`);
      interviewWS.send(
        JSON.stringify({
          type: 'proctoring_violation',
          violationType: type,
          timestamp: now,
        })
      );
      lastViolationRef.current = { type, time: now };
    }
  };

  useEffect(() => {
    log('🎬 FaceDetection useEffect triggered', { 
      hasVideo: !!videoElement,
      hasWS: !!interviewWS 
    });

    if (!videoElement) {
      error(' No video element provided to FaceDetection');
      return;
    }

    if (!interviewWS) {
      error(' No WebSocket provided to FaceDetection');
      return;
    }

    const startProctoring = async () => {
      try {
        log(' Starting face proctoring...');
        log('📹 Video element state:', {
          readyState: videoElement.readyState,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          paused: videoElement.paused
        });

        // Wait for video to be ready
        if (videoElement.readyState < 2) {
          log(' Waiting for video to load...');
          await new Promise((resolve) => {
            videoElement.onloadeddata = () => {
              log(' Video loaded');
              resolve();
            };
          });
        }

        // Lazy load TensorFlow only when needed
        log('📦 Loading TensorFlow.js...');
        const [tf, faceDetection] = await Promise.all([
          import('@tensorflow/tfjs'),
          import('@tensorflow-models/face-detection')
        ]);
        
        log('🧠 Loading TensorFlow.js...');
        await tf.ready();
        log(' TensorFlow.js ready');
        
        log('🔧 Creating face detector...');
        detectorRef.current = await faceDetection.createDetector(
          faceDetection.SupportedModels.MediaPipeFaceDetector,
          {
            runtime: 'tfjs',
            maxFaces: 2,
          }
        );

        log(' Face detector loaded successfully');
        setIsLoading(false);

        // Wait 3 seconds before starting detection (let user settle)
        log(' Waiting 3 seconds before starting detection...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        log('🔁 Starting detection loop...');
        // 🔁 Detection loop
        intervalRef.current = setInterval(async () => {
          if (!detectorRef.current || !videoElement) {
            warn(' Detector or video not available');
            return;
          }

          try {
            const faces = await detectorRef.current.estimateFaces(videoElement);
            log(`👤 Faces detected: ${faces.length}`, faces.length > 0 ? faces[0] : '');

            if (faces.length === 0) {
              sendViolation('no_face');
            } else if (faces.length > 1) {
              sendViolation('multiple_faces');
            } else {
              // Reset cooldown when face is properly detected
              lastViolationRef.current = { type: null, time: 0 };
            }
          } catch (err) {
            error(' Face detection error:', err);
          }
        }, 5000); // Check every 5 seconds (less aggressive)
      } catch (err) {
        error(' Face proctoring setup error:', err);
        error('Error details:', err.message, err.stack);
        setError(err.message);
        setIsLoading(false);
      }
    };

    startProctoring();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (detectorRef.current) {
        detectorRef.current = null;
      }
    };
  }, [interviewWS, videoElement]);

  return null; // No UI needed
};

export default FaceDetection;
