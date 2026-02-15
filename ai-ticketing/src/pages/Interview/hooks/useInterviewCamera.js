import { useRef, useState, useEffect, useCallback } from "react";
import { logger } from "../../../utils/logger.js";

export function useInterviewCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [startProctoring, setStartProctoring] = useState(false);

    const stopVideoStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsVideoReady(false);
    setStartProctoring(false);
  }, []);

  // 🎥 Initialize Camera
  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => {
              logger.log("📹 Camera ready");

              setIsVideoReady(true);

              // small delay to stabilize
              setTimeout(() => {
                setStartProctoring(true);
              }, 1000);
            }).catch((err) => {
              logger.warn("Video play failed:", err);
            });
          };
        }
      } catch (err) {
        logger.warn("Camera access failed:", err);
      }
    };

    setupCamera();

    return () => {
      stopVideoStream();
    };
  }, [stopVideoStream]);




  return {
    videoRef,
    isVideoReady,
    startProctoring,
    stopVideoStream,
  };
}
