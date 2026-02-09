import { useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceDetection from '@tensorflow-models/face-detection';

const FaceDetection = ({ interviewWS, videoElement }) => {
  const detectorRef = useRef(null);
  const intervalRef = useRef(null);
  const lastViolationRef = useRef({ type: null, time: 0 });

  console.log('🔍 FaceDetection mounted', { 
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
      console.log(`🚨 Face violation: ${type}`);
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
    console.log('🎬 FaceDetection useEffect triggered', { 
      hasVideo: !!videoElement,
      hasWS: !!interviewWS 
    });

    if (!videoElement) {
      console.error('❌ No video element provided to FaceDetection');
      return;
    }

    if (!interviewWS) {
      console.error('❌ No WebSocket provided to FaceDetection');
      return;
    }

    const startProctoring = async () => {
      try {
        console.log('🚀 Starting face proctoring...');
        console.log('📹 Video element state:', {
          readyState: videoElement.readyState,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          paused: videoElement.paused
        });

        // Wait for video to be ready
        if (videoElement.readyState < 2) {
          console.log('⏳ Waiting for video to load...');
          await new Promise((resolve) => {
            videoElement.onloadeddata = () => {
              console.log('✅ Video loaded');
              resolve();
            };
          });
        }

        // 🧠 TFJS
        console.log('🧠 Loading TensorFlow.js...');
        await tf.ready();
        console.log('✅ TensorFlow.js ready');
        
        console.log('🔧 Creating face detector...');
        detectorRef.current = await faceDetection.createDetector(
          faceDetection.SupportedModels.MediaPipeFaceDetector,
          {
            runtime: 'tfjs',
            maxFaces: 2,
          }
        );

        console.log('✅ Face detector loaded successfully');

        // Wait 3 seconds before starting detection (let user settle)
        console.log('⏳ Waiting 3 seconds before starting detection...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('🔁 Starting detection loop...');
        // 🔁 Detection loop
        intervalRef.current = setInterval(async () => {
          if (!detectorRef.current || !videoElement) {
            console.warn('⚠️ Detector or video not available');
            return;
          }

          try {
            const faces = await detectorRef.current.estimateFaces(videoElement);
            console.log(`👤 Faces detected: ${faces.length}`, faces.length > 0 ? faces[0] : '');

            if (faces.length === 0) {
              sendViolation('no_face');
            } else if (faces.length > 1) {
              sendViolation('multiple_faces');
            } else {
              // Reset cooldown when face is properly detected
              lastViolationRef.current = { type: null, time: 0 };
            }
          } catch (err) {
            console.error('❌ Face detection error:', err);
          }
        }, 5000); // Check every 5 seconds (less aggressive)
      } catch (err) {
        console.error('❌ Face proctoring setup error:', err);
        console.error('Error details:', err.message, err.stack);
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
