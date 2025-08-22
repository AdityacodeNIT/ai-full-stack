import { useEffect, useState, useRef } from 'react';

const InterviewSession = ({ interviewId }) => {
  // State
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [finalReport, setFinalReport] = useState(null);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Refs
  const interviewSocket = useRef(null);
  const assemblySocket = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioWorkletRef = useRef(null);
  const speechTimeoutRef = useRef(null);
  const connectionStateRef = useRef('disconnected');

  // --- Core Functions ---

  const speak = (text) => {
    return new Promise((resolve, reject) => {
      try {
        // Clear any existing timeout
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }

        // Stop any current speech
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
          // Wait for cancel to complete
          setTimeout(() => startSpeaking(), 100);
        } else {
          startSpeaking();
        }

        function startSpeaking() {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 0.9;
          utterance.volume = 0.8;
          
          setIsSpeaking(true);
          
          utterance.onstart = () => {
            console.log('[SpeechSynthesis] Started speaking:', text.substring(0, 50));
          };
          
          utterance.onend = () => {
            console.log('[SpeechSynthesis] Finished speaking');
            setIsSpeaking(false);
            resolve();
          };
          
          utterance.onerror = (err) => {
            console.error('[SpeechSynthesis] Error:', err);
            setIsSpeaking(false);
            reject(err);
          };

          // Safety timeout - resolve after 30 seconds even if onend doesn't fire
          speechTimeoutRef.current = setTimeout(() => {
            console.warn('[SpeechSynthesis] Timeout reached, forcing resolve');
            setIsSpeaking(false);
            resolve();
          }, 30000);

          console.log('[SpeechSynthesis] Speaking:', text.substring(0, 50));
          speechSynthesis.speak(utterance);
        }
      } catch (err) {
        console.error('[SpeechSynthesis] Error in speak function:', err);
        setIsSpeaking(false);
        reject(err);
      }
    });
  };

  const stopTranscription = async () => {
    console.log('[Transcription] Stopping transcription...');
    
    try {
      // Stop WebSocket first
      if (assemblySocket.current && assemblySocket.current.readyState === WebSocket.OPEN) {
        assemblySocket.current.close(1000, 'Stopping transcription');
      }
      
      // Stop AudioWorklet
      if (audioWorkletRef.current) {
        await audioWorkletRef.current.port.postMessage({ command: 'stop' });
        audioWorkletRef.current.disconnect();
        audioWorkletRef.current = null;
        console.log('[Audio] AudioWorklet stopped and disconnected.');
      }
      
      // Close AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
        audioContextRef.current = null;
        console.log('[Audio] AudioContext closed.');
      }
      
      assemblySocket.current = null;
      connectionStateRef.current = 'disconnected';
      setIsTranscribing(false);
    } catch (err) {
      console.error('[Transcription] Error stopping transcription:', err);
      setIsTranscribing(false);
    }
  };

  const startTranscription = async () => {
    if (!mediaStreamRef.current) {
      setError('Microphone stream was not acquired.');
      console.error('[Error] No media stream available.');
      return;
    }

    try {
      console.log('[Transcription] Starting transcription...');
      
      // Create WebSocket connection
      const socket = new WebSocket("ws://localhost:3000/ws/assembly");
      assemblySocket.current = socket;
      connectionStateRef.current = 'connecting';

<<<<<<< HEAD:ai-ticketing/src/pages/interview.jsx
      socket.onopen = async () => {
        console.log("[WebSocket] AssemblyAI socket connected.");
        connectionStateRef.current = 'connected';
        
        try {
          // Create AudioContext with proper sample rate
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ 
            sampleRate: 16000 
          });
          
          // Resume if suspended (required by browser autoplay policies)
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
=======
      const socket = new WebSocket(`${import.meta.env.VITE_WS_URL}/assembly`);
      socket.binaryType = 'arraybuffer';

      socket.onopen = () => {
        console.log('🎤 AssemblyAI socket connected');
        setIsTranscribing(true);

        const recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (socket.readyState === WebSocket.OPEN) {
            e.data.arrayBuffer().then((buf) => {
              socket.send(buf);
              console.log(`✉️ sendAudio ${buf.byteLength}B`);
            });
>>>>>>> ba77a9a70fdc21cc75c2f4f4445dcacd2a63b38c:ai-ticketing/src/pages/InterviewSession.jsx
          }

          // Load and create AudioWorklet
          await audioContextRef.current.audioWorklet.addModule('/audio-processor.js');
          
          audioWorkletRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
          
          // Connect audio source
          const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
          source.connect(audioWorkletRef.current);
          
          // Handle processed audio data
          audioWorkletRef.current.port.onmessage = (event) => {
            const { audioData } = event.data;
            if (audioData && socket.readyState === WebSocket.OPEN) {
              try {
                socket.send(audioData);
              } catch (sendErr) {
                console.error('[WebSocket] Error sending audio data:', sendErr);
              }
            }
          };

          // Start processing
          await audioWorkletRef.current.port.postMessage({ command: 'start' });
          setIsTranscribing(true);
          console.log("[Audio] Audio processing started successfully.");
          
        } catch (audioErr) {
          console.error("[Audio] Error setting up audio processing:", audioErr);
          setError("Failed to start audio processing: " + audioErr.message);
          socket.close();
        }
      };

      socket.onmessage = (e) => {
        try {
          const message = JSON.parse(e.data);
          if (message.text) {
            setTranscript((prev) => {
              const newTranscript = prev ? `${prev} ${message.text}` : message.text;
              console.log('[Transcript] Updated:', newTranscript.substring(0, 100));
              return newTranscript;
            });
          }
        } catch (err) {
          console.error("[WebSocket] Error parsing message:", err);
        }
      };

      socket.onerror = (err) => {
        console.error("[WebSocket] AssemblyAI socket error:", err);
        setError("Transcription connection error.");
        connectionStateRef.current = 'error';
        stopTranscription();
      };

      socket.onclose = (event) => {
        console.log("[WebSocket] AssemblyAI connection closed:", event.code, event.reason);
        connectionStateRef.current = 'disconnected';
        if (event.code !== 1000) { // Not a normal close
          console.error("[WebSocket] Unexpected close, code:", event.code);
        }
      };

    } catch (err) {
      console.error("[Transcription] Failed to start transcription:", err);
      setError("Failed to start transcription: " + err.message);
      connectionStateRef.current = 'error';
    }
  };

  const handleNewQuestion = async (newQuestion) => {
    console.log('[Interview] New question received:', newQuestion);
    
    try {
      // Stop current transcription
      await stopTranscription();
      
      // Reset state
      setTranscript('');
      setAnalysis(null);
      setQuestion(newQuestion);
      
      // Speak question
      await speak(newQuestion);
      
      // Wait a moment for speech to settle
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Start transcription for answer
      await startTranscription();
      
    } catch (err) {
      console.error('[Interview] Error in new question flow:', err);
      setError('Failed to process new question: ' + err.message);
    }
  };

<<<<<<< HEAD:ai-ticketing/src/pages/interview.jsx
  const handleSubmitAnswer = async () => {
    try {
      await stopTranscription();
      
      const finalResponse = transcript.trim();
      console.log('[Interview] Submitting answer:', finalResponse);
      
      if (!finalResponse) {
        setError('No response detected. Please try speaking again.');
        return;
      }
      
      if (interviewSocket.current?.readyState === WebSocket.OPEN) {
        interviewSocket.current.send(
          JSON.stringify({ type: 'response', response: finalResponse })
        );
      } else {
        setError('Connection lost. Please refresh.');
        console.error('[Interview] Interview socket not open when submitting answer.');
      }
    } catch (err) {
      console.error('[Interview] Error submitting answer:', err);
      setError('Failed to submit answer: ' + err.message);
    }
  };
=======
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
        setError("Authentication token not found. Please log in again.");
        return;
    }

    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws/interview?token=${token}`;
    interviewSocket.current = new WebSocket(wsUrl);
>>>>>>> ba77a9a70fdc21cc75c2f4f4445dcacd2a63b38c:ai-ticketing/src/pages/InterviewSession.jsx

  const startInterview = async () => {
    setError(null);
    
    try {
      // Request microphone access
      console.log('[Interview] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      mediaStreamRef.current = stream;
      console.log('[Interview] Microphone stream acquired.');
      
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access and refresh.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and refresh.');
      } else {
        setError('Failed to access microphone: ' + err.message);
      }
      console.error('[Interview] Microphone access error:', err);
      return;
    }

    setIsInterviewStarted(true);

    // Create interview WebSocket
    const socket = new WebSocket("ws://localhost:3000/ws/interview");
    interviewSocket.current = socket;

    socket.onopen = () => {
      console.log("[Interview] Interview socket connected, sending start.");
      socket.send(JSON.stringify({ type: "start", interviewId }));
    };

    socket.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log("[Interview] Message received:", data.type);
        
        switch (data.type) {
          case "question":
            await handleNewQuestion(data.question);
            break;
          case "analysis":
            setAnalysis(data.analysis);
            console.log("[Interview] Analysis received");
            break;
          case "finalReport":
            setFinalReport(data.report);
            console.log("[Interview] Final report received");
            break;
          case "end":
            setCompleted(true);
            await stopTranscription(); // Clean up
            console.log("[Interview] Interview ended.");
            break;
          case "error":
            const errorMsg = data.message || "An unknown error occurred.";
            setError(errorMsg);
            console.error("[Interview] Error message:", errorMsg);
            break;
          default:
            console.warn("[Interview] Unknown message type:", data.type);
        }
      } catch (err) {
        console.error("[Interview] Error parsing message:", err);
        setError("Failed to process server response");
      }
    };

    socket.onerror = (err) => {
      console.error("[Interview] Interview socket error:", err);
      setError("Interview connection failed. Please check if the server is running.");
    };

    socket.onclose = (event) => {
      console.log("[Interview] Interview socket closed:", event.code, event.reason);
      if (!completed && event.code !== 1000) {
        setError("Connection lost unexpectedly. Please refresh to restart.");
      }
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[Cleanup] Component unmounting, cleaning up resources...');
      
      // Clear timeouts
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      
      // Stop speech
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      
      // Stop transcription
      stopTranscription();
      
      // Close interview socket
      if (interviewSocket.current) {
        interviewSocket.current.close(1000, 'Component unmounting');
        interviewSocket.current = null;
      }
      
      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log('[Cleanup] Media track stopped:', track.kind);
        });
        mediaStreamRef.current = null;
      }
    };
  }, []);

  // --- Render Logic ---
  if (!isInterviewStarted) {
    return (
      <div className="p-6 max-w-xl mx-auto bg-black rounded shadow text-white text-center">
        <h2 className="text-lg font-semibold mb-4">🎤 AI Voice Interview</h2>
        <p className="text-sm text-gray-300 mb-4">
          Make sure you have a working microphone and speakers/headphones
        </p>
        <button
          onClick={startInterview}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={!!error}
        >
          Start Interview
        </button>
        {error && (
          <div className="mt-4 p-3 bg-red-900 rounded">
            <p className="text-red-300 font-semibold">⚠️ {error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto bg-black rounded shadow text-white">
      <h2 className="text-lg font-semibold mb-4">🎤 AI Voice Interview</h2>
      
      {completed ? (
        <div className="text-green-500 text-xl">✅ Interview completed!</div>
      ) : (
        <>
          <div className="mb-4">
            <p className="mb-2 text-white">
              🧠 Question: {question || 'Waiting for first question...'}
            </p>
            <div className="flex items-center gap-2 text-sm">
              {isSpeaking && <span className="text-blue-400">🔊 AI Speaking...</span>}
              {isTranscribing && !isSpeaking && <span className="text-green-400">🎙️ Listening...</span>}
              {!isTranscribing && !isSpeaking && <span className="text-gray-400">⏸️ Ready</span>}
            </div>
          </div>

          {isTranscribing && !isSpeaking && (
            <button
              onClick={handleSubmitAnswer}
              className="mb-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ⏹ Submit Answer
            </button>
          )}

          {transcript && (
            <div className="mb-4 p-3 bg-gray-800 rounded">
              <p className="text-sm text-gray-300 mb-1">Your Response:</p>
              <p className="italic text-gray-100">{transcript}</p>
            </div>
          )}
        </>
      )}

      {analysis && !completed && (
        <div className="mt-4 bg-gray-800 p-3 rounded">
          <strong className="text-blue-300">AI Feedback:</strong>
          <p className="mt-1">{typeof analysis === 'string' ? analysis : analysis.summary}</p>
        </div>
      )}

      {finalReport && (
        <div className="mt-6 bg-green-900 p-4 rounded">
          <h3 className="text-lg font-bold text-green-300 mb-2">📝 Final Summary</h3>
          <p>{finalReport.overall}</p>
        </div>
      )}

      {error && !completed && (
        <div className="mt-4 p-3 bg-red-900 rounded">
          <p className="text-red-300 font-semibold">⚠️ Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-3 py-1 bg-red-700 text-white rounded text-sm hover:bg-red-600"
          >
            Refresh Page
          </button>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;