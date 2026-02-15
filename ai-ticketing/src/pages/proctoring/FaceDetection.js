import { useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as faceDetection from '@tensorflow-models/face-detection';

const FaceDetection = ({ interviewWS }) => {
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);

  const sendViolation = (type) => {
    if (interviewWS?.readyState === WebSocket.OPEN) {
      interviewWS.send(
        JSON.stringify({
          type: 'proctoring_violation',
          violationType: type,
          timestamp: Date.now(),
        })
      );
    }
  };

  useEffect(() => {
    const startProctoring = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        // 🧠 TFJS
        await tf.ready();
        detectorRef.current = await faceDetection.createDetector(
          faceDetection.SupportedModels.MediaPipeFaceDetector,
          {
            runtime: 'tfjs',
            maxFaces: 2,
          }
        );

        // 🔁 Detection loop
        intervalRef.current = setInterval(async () => {
          if (!detectorRef.current || !videoRef.current) return;

          const faces = await detectorRef.current.estimateFaces(
            videoRef.current
          );

          if (faces.length === 0) {
            sendViolation('no_face');
          } else if (faces.length > 1) {
            sendViolation('multiple_faces');
          }
        }, 2000);
      } catch (err) {
        console.error(' Proctoring error:', err);
      }
    };

    startProctoring();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="hidden"
    />
  );
};

export default FaceDetection;
