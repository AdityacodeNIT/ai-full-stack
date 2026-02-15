import { useState, useCallback, useRef, useEffect } from 'react';
import FaceDetection from './FaceDetection';
import ObjectDetector from './ObjectDetector';
import { logger } from '../../utils/logger';

const ProctoringSystem = ({ interviewWS }) => {
  const [violations, setViolations] = useState([]);
  const [showViolations, setShowViolations] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [objectCount, setObjectCount] = useState(0);

  // Shared violation handler for both detectors
  const handleViolation = useCallback((type, details = null) => {
    const violation = {
      type,
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    
    logger.log('📝 Adding violation to UI:', violation);
    setViolations(prev => [...prev, violation]);
  }, []);

  // Object detection callback
  const handleObjectDetection = useCallback((predictions) => {
    setObjectCount(predictions.length);
    if (predictions.length > 0) {
      logger.log('📦 Objects:', predictions.map(p => `${p.class} (${Math.round(p.score * 100)}%)`).join(', '));
    }
  }, []);

  // Initialize camera once for both detectors
  useEffect(() => {
    const initCamera = async () => {
      try {
        logger.log('📹 Initializing camera for proctoring...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480,
            facingMode: 'user'
          } 
        });
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to be fully loaded
          await new Promise((resolve) => {
            videoRef.current.onloadeddata = resolve;
          });
          
          logger.log(' Camera ready, video dimensions:', 
            videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          setCameraReady(true);
        }
      } catch (err) {
        logger.error(' Camera initialization error:', err);
      }
    };

    initCamera();

    return () => {
      logger.log('🧹 Cleaning up camera stream');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="mb-4">
      {/* Hidden video element shared by both detectors */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* Proctoring Status Bar */}
      <div className="bg-gray-800 p-3 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${cameraReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              <span className="text-sm text-gray-300">
                {cameraReady ? 'Proctoring Active' : 'Initializing...'}
              </span>
            </div>
            
            {violations.length > 0 && (
              <button
                onClick={() => setShowViolations(!showViolations)}
                className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
              >
                {violations.length} violation(s)
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>👤 Face Detection</span>
            <span>•</span>
            <span>📦 Objects: {objectCount}</span>
          </div>
        </div>

        {/* Violations List */}
        {showViolations && violations.length > 0 && (
          <div className="mt-2 bg-red-900 bg-opacity-30 p-3 rounded-lg max-h-40 overflow-y-auto">
            <h4 className="text-sm font-semibold text-red-400 mb-2">Proctoring Violations</h4>
            <div className="space-y-1">
              {violations.map((v, idx) => (
                <div key={idx} className="text-xs text-gray-300 flex justify-between">
                  <span>
                    {v.type === 'no_face' && ' No face detected'}
                    {v.type === 'multiple_faces' && ' Multiple faces detected'}
                    {v.type === 'suspicious_object' && ` Suspicious: ${v.details?.objects}`}
                  </span>
                  <span className="text-gray-500">{v.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detection components (logic only, no UI) */}
      {cameraReady && (
        <>
          <FaceDetection 
            interviewWS={interviewWS} 
            videoElement={videoRef.current}
            onViolation={handleViolation}
          />
          <ObjectDetector 
            interviewWS={interviewWS} 
            videoElement={videoRef.current}
            onViolation={handleViolation}
            onDetection={handleObjectDetection}
          />
        </>
      )}
    </div>
  );
};

export default ProctoringSystem;
