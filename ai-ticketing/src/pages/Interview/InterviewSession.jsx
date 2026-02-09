import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import FaceDetection from '../proctoring/FaceDetection.jsx';
import { useInterviewSocket } from './hooks/useInterviewSocket.js';

const InterviewSession = ({ interviewId }) => {
  const { getToken } = useAuth();
  
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [finalReport, setFinalReport] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  
  // NEW: Store all question analyses
  const [questionAnalyses, setQuestionAnalyses] = useState([]);
  const [showPreviousAnalyses, setShowPreviousAnalyses] = useState(false);

  // Video feed refs
  const userVideoRef = useRef(null);
  const userVideoStream = useRef(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [startProctoring, setStartProctoring] = useState(false);

  const assemblyWS = useRef(null);
  const audioCtx = useRef(null);
  const workletNode = useRef(null);
  const mediaSource = useRef(null);
  const mediaStream = useRef(null);
  const partial = useRef('');
  const isTranscribingRef = useRef(false);
  const hasSubmittedResponse = useRef(false);
  const sendFnRef = useRef(null); // Store send function for callbacks




  useEffect(() => {
    isTranscribingRef.current = isTranscribing;
  }, [isTranscribing]);

  const questionQueue = useRef([]);
  const processedQuestions = useRef(new Set());

  // --- Send message to AssemblyAI ---
  const sendAssemblyMsg = (msg) => {
    const socket = assemblyWS.current;
    if (!socket) return;

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    } else if (socket.readyState === WebSocket.CONNECTING) {
      socket.addEventListener(
        'open',
        () => socket.send(JSON.stringify(msg)),
        { once: true }
      );
    }
  };

  // --- TTS function ---
  const speak = useCallback(
    (text) =>
      new Promise((resolve) => {
        if (!text) return resolve();

        setIsSpeaking(true);
        sendAssemblyMsg({ type: 'tts_start' });

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;

        utterance.onend = () => {
          sendAssemblyMsg({ type: 'tts_end' });
          setIsSpeaking(false);
          setTimeout(() => resolve(), 500);
        };

        utterance.onerror = () => {
          sendAssemblyMsg({ type: 'tts_end' });
          setIsSpeaking(false);
          resolve();
        };

        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      }),
    []
  );

  // --- Submit response to backend ---
  const submitResponse = useCallback((sendFn) => {
    const currentTranscript = partial.current.trim();
    
    if (currentTranscript.length > 5 && !hasSubmittedResponse.current) {
      hasSubmittedResponse.current = true;
      setIsProcessingResponse(true);
      
      console.log('Submitting response:', currentTranscript);
      sendFn({
        type: 'response',
        response: currentTranscript
      });
    }
  }, []);

  // --- Stop transcription ---
  const stopTranscription = useCallback((shouldSubmit = true, sendFn = null) => {
    if (!isTranscribing) return;

    setIsTranscribing(false);

    if (shouldSubmit && !hasSubmittedResponse.current && sendFn) {
      submitResponse(sendFn);
    }

    workletNode.current?.port.postMessage({ command: 'stop' });
    workletNode.current?.disconnect();
    workletNode.current = null;

    mediaSource.current?.disconnect();
    mediaStream.current?.getTracks().forEach((t) => t.stop());
    mediaStream.current = null;

    audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;

    if (assemblyWS.current?.readyState === 1) assemblyWS.current.close();
    assemblyWS.current = null;
  }, [isTranscribing, submitResponse]);

  // --- Start transcription ---
  const startTranscription = useCallback(async () => {
    if (isTranscribing || isSpeaking) return;
    
    setError(null);
    partial.current = '';
    setTranscript('');
    hasSubmittedResponse.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;

      const C = window.AudioContext || window.webkitAudioContext;
      const ctx = new C({ sampleRate: 16000, latencyHint: 'interactive' });
      audioCtx.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume();

      await ctx.audioWorklet.addModule('/audio-processor.js');
      const node = new AudioWorkletNode(ctx, 'audio-processor', {
        processorOptions: { sampleRate: 16000 },
      });
      workletNode.current = node;

      const src = ctx.createMediaStreamSource(stream);
      mediaSource.current = src;
      src.connect(node);

      const token = await getToken();
      const socket = new WebSocket(`${import.meta.env.VITE_WS_URL}/assembly?token=${token}`);
      assemblyWS.current = socket;
      socket.binaryType = 'arraybuffer';

      const timeout = setTimeout(() => {
        setError('AssemblyAI connection timeout');
        stopTranscription(false, null);
      }, 10000);

      socket.onopen = () => {
        clearTimeout(timeout);
        node.port.postMessage({ command: 'start' });
        setIsTranscribing(true);
        

        node.port.onmessage = (e) => {
          if (socket.readyState === WebSocket.OPEN) socket.send(e.data.audioData);
        };
      };

      socket.onmessage = (e) => {
        const d = JSON.parse(e.data);
        
        if (d.text && d.text !== partial.current) {
          partial.current = d.text;
          setTranscript(d.text);
        }
      };

      socket.onerror = () => {
        setError('Transcription error');
        stopTranscription(false, null);
      };
    } catch (err) {
      setError(`Audio setup failed: ${err.message}`);
      stopTranscription(false, null);
    }
  }, [isTranscribing, isSpeaking, stopTranscription, getToken]);

  // --- Process next question in queue ---
  const processNextQuestion = useCallback(async () => {
    if (isTranscribing || questionQueue.current.length === 0) return;

    const { q, idx, tot } = questionQueue.current.shift();

    setQuestion(q);
    setQIndex(idx);
    setTotal(tot);
    setAnalysis(null);
    setTranscript('');
    setIsProcessingResponse(false);
    partial.current = '';
    hasSubmittedResponse.current = false;

    await speak(q);
    
    if (!completed) {
      await startTranscription();
    }
  }, [startTranscription, speak, isTranscribing, completed]);

  // --- Handle new question ---
  const handleQuestion = useCallback(
    (q, idx, tot) => {
      if (processedQuestions.current.has(idx)) return;
      processedQuestions.current.add(idx);
      questionQueue.current.push({ q, idx, tot });

      if (!isTranscribingRef.current && !isProcessingResponse) {
        processNextQuestion();
      }
    },
    [processNextQuestion, isProcessingResponse]
  );

  // Define handlers - use useMemo for object, not useCallback
  const handlers = useMemo(() => ({
    test: (msg, ws) => {
      ws.send(JSON.stringify({ type: 'start', interviewId }));
    },

    question: (msg) => {
      handleQuestion(
        msg.question,
        (msg.questionNumber || msg.questionIndex || 1) - 1,
        msg.totalQuestions || msg.numberOfQuestions || 10
      );
    },

    analysis: (msg) => {
      setAnalysis(msg.analysis);
      setIsProcessingResponse(false);

      setQuestionAnalyses(prev => [
        ...prev,
        {
          questionIndex: qIndex,
          question,
          response: partial.current,
          analysis: msg.analysis,
          timestamp: new Date()
        }
      ]);

      setTimeout(() => {
        if (questionQueue.current.length > 0) {
          processNextQuestion();
        }
      }, 3000);
    },

    acknowledgment: (msg) => {
      // Batch mode: answer recorded, no analysis yet
      setIsProcessingResponse(false);
      console.log('✅ Answer recorded:', msg.message);
      
      setTimeout(() => {
        if (questionQueue.current.length > 0) {
          processNextQuestion();
        }
      }, 1500);
    },

    evaluating: (msg) => {
      console.log('🔄 Evaluating interview:', msg.message);
      setIsProcessingResponse(true);
    },

    finalReport: (msg) => {
      setFinalReport(msg.report);
      setIsProcessingResponse(false);
    },

    end: () => {
      stopTranscription(false, null);
      setCompleted(true);
    },

    error: (msg) => {
      setError(msg.message);
      setIsProcessingResponse(false);
      stopTranscription(false, null);
    },
  }), [interviewId, handleQuestion, qIndex, question, processNextQuestion, stopTranscription]);

  const {
    interviewWS,
    status,
    send,
  } = useInterviewSocket(interviewId, handlers);

  // Store send function in ref for use in callbacks
  useEffect(() => {
    sendFnRef.current = send;
  }, [send]);

  // Setup user video feed
  useEffect(() => {
    const setupUserVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480 },
          audio: false 
        });
        userVideoStream.current = stream;
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
          // Wait for video to be ready and playing
          userVideoRef.current.onloadedmetadata = () => {
            userVideoRef.current.play().then(() => {
              console.log('✅ User video ready and playing for proctoring');
              console.log('📹 Video dimensions:', {
                width: userVideoRef.current.videoWidth,
                height: userVideoRef.current.videoHeight,
                readyState: userVideoRef.current.readyState
              });
              setIsVideoReady(true);
              // Wait 1 second before starting proctoring to ensure video is stable
              setTimeout(() => {
                console.log('🎬 Starting proctoring...');
                setStartProctoring(true);
              }, 1000);
            }).catch(err => {
              console.error('❌ Failed to play video:', err);
            });
          };
        }
      } catch (err) {
        console.error('Failed to access camera:', err);
      }
    };

    setupUserVideo();

    // Cleanup on unmount
    return () => {
      if (userVideoStream.current) {
        userVideoStream.current.getTracks().forEach(track => track.stop());
      }
      setIsVideoReady(false);
      setStartProctoring(false);
    };
  }, []);



  // --- Manual submit button ---
  const handleManualSubmit = useCallback(() => {
    if (partial.current.trim().length > 5) {
      stopTranscription(true, sendFnRef.current);
    } else {
      setError('Please provide a longer response');
    }
  }, [stopTranscription]);


  return (
    <div className="p-6 bg-gray-900 text-white rounded max-w-7xl mx-auto">
       {status === 'connected' && !completed && startProctoring && (
      <FaceDetection interviewWS={interviewWS.current} videoElement={userVideoRef.current} />
    )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div
            className={`w-3 h-3 mr-2 rounded-full ${
              status === 'connected'
                ? 'bg-green-500'
                : status === 'error'
                ? 'bg-red-500'
                : 'bg-gray-500'
            }`}
          />
          <span className="text-sm">{status}</span>
        </div>
        
        {/* NEW: Toggle button for previous analyses */}
        {questionAnalyses.length > 0 && (
          <button
            onClick={() => setShowPreviousAnalyses(!showPreviousAnalyses)}
            className="bg-blue-600 hover:bg-blue-700 py-1 px-3 rounded text-sm"
          >
            {showPreviousAnalyses ? 'Hide' : 'Show'} Previous Analyses ({questionAnalyses.length})
          </button>
        )}
      </div>

      <h2 className="text-2xl mb-4">AI Voice Interview</h2>

      {/* NEW: Previous Analyses Section */}
      {showPreviousAnalyses && questionAnalyses.length > 0 && (
        <div className="mb-6 bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-3">Previous Question Analyses</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {questionAnalyses.map((qa, index) => (
              <div key={index} className="bg-gray-700 p-3 rounded">
                <div className="text-sm text-gray-400 mb-2">
                  Question {qa.questionIndex + 1}: {qa.question}
                </div>
                <div className="text-sm mb-2">
                  <strong>Your Response:</strong> {qa.response.substring(0, 100)}
                  {qa.response.length > 100 && '...'}
                </div>
                <div className="text-sm">
                  <strong>Feedback:</strong> {qa.analysis.summary}
                </div>
                <div className="text-xs text-gray-400 mt-1 flex gap-4">
                  <span>Confidence: {qa.analysis.confidence}</span>
                  <span>Clarity: {qa.analysis.clarity}</span>
                  <span>Score: {qa.analysis.score || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed ? (
        <div className="text-green-400">Interview completed!</div>
      ) : (
        <>
          <div className="bg-gray-800 p-4 rounded mb-6">
            <p className="font-semibold text-center text-lg">
              Q {qIndex + 1}/{total}: {question || 'Waiting…'}
            </p>
          </div>

          {/* Video Feeds Section */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* User Video Feed - Left */}
              <div className="relative">
                <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                  <video
                    ref={userVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-80 object-cover bg-gray-900"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">You</span>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isTranscribing ? 'bg-red-500 animate-pulse' : 'bg-gray-600'
                          }`}
                        />
                        <span className="text-sm text-white">
                          {isTranscribing ? 'Recording' : 'Standby'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Avatar - Right */}
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg overflow-hidden shadow-lg h-80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <svg 
                        className="w-20 h-20 text-white" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                    </div>
                    <p className="text-white text-lg font-semibold">AI Interviewer</p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">AI Assistant</span>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'
                          }`}
                        />
                        <span className="text-sm text-white">
                          {isSpeaking ? 'Speaking' : 'Silent'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Centered Submit Button */}
            <div className="flex justify-center">
              {isTranscribing && transcript.length > 10 && (
                <button
                  onClick={handleManualSubmit}
                  className="bg-green-600 hover:bg-green-700 py-3 px-8 rounded-lg text-lg font-semibold shadow-lg transition-all transform hover:scale-105"
                  disabled={isProcessingResponse}
                >
                  Submit Answer
                </button>
              )}
              
              {isTranscribing && transcript.length <= 10 && (
                <button
                  onClick={() => stopTranscription(false, null)}
                  className="bg-red-600 hover:bg-red-700 py-3 px-8 rounded-lg text-lg font-semibold shadow-lg"
                >
                  Cancel Recording
                </button>
              )}

              {isProcessingResponse && (
                <div className="bg-yellow-600 py-3 px-8 rounded-lg text-lg font-semibold shadow-lg flex items-center gap-3">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing your response...
                </div>
              )}
            </div>
          </div>

          {/* Live transcript */}
          {transcript && (
            <div className="bg-gray-800 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-400 mb-2">Your response:</p>
              <p className="italic text-lg">{transcript}</p>
              <p className="text-xs text-gray-500 mt-2">
                {transcript.split(' ').length} words
              </p>
            </div>
          )}
        </>
      )}

      {error && <p className="text-red-400 mt-4">{error}</p>}
      
      {/* Current question feedback */}
      {analysis && !isProcessingResponse && (
        <div className="mt-4 bg-gray-800 p-4 rounded border border-gray-700">
          <strong className="text-green-400">Current Question Feedback:</strong>
          <p className="mt-2">{analysis.summary || 'Analysis complete'}</p>
          <div className="mt-2 text-sm grid grid-cols-2 gap-2">
            <span className="text-gray-400">Confidence: {analysis.confidence}</span>
            <span className="text-gray-400">Clarity: {analysis.clarity}</span>
            <span className="text-gray-400">Leadership: {analysis.leadership}</span>
            <span className="text-gray-400">Technical: {analysis.technicalUnderstanding}</span>
          </div>
          {analysis.score && (
            <div className="mt-2 text-sm">
              <span className="text-gray-400">Score: </span>
              <span className="font-semibold">{analysis.score}/100</span>
            </div>
          )}
        </div>
      )}
      
      {finalReport && (
        <div className="mt-6 space-y-6">
          {/* Overall Score Card */}
          <div className="bg-gradient-to-r from-blue-900 to-purple-900 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Interview Complete!</h2>
              <div className="text-right">
                <div className="text-4xl font-bold text-white">{finalReport.overallScore}/100</div>
                <div className="text-sm text-gray-300">Overall Score</div>
              </div>
            </div>
            
            {/* Recommendation Badge */}
            <div className="mb-4">
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                finalReport.recommendation === 'Strong Hire' ? 'bg-green-500 text-white' :
                finalReport.recommendation === 'Hire' ? 'bg-blue-500 text-white' :
                finalReport.recommendation === 'Maybe' ? 'bg-yellow-500 text-black' :
                'bg-red-500 text-white'
              }`}>
                {finalReport.recommendation}
              </span>
            </div>

            {/* Overall Summary */}
            {finalReport.overallSummary && (
              <p className="text-gray-200 leading-relaxed">{finalReport.overallSummary}</p>
            )}

            {/* Recommendation Reason */}
            {finalReport.recommendationReason && (
              <div className="mt-4 p-4 bg-white bg-opacity-10 rounded">
                <p className="text-sm text-gray-200">
                  <strong>Why:</strong> {finalReport.recommendationReason}
                </p>
              </div>
            )}
          </div>

          {/* Dimension Scores */}
          {(finalReport.technicalScore || finalReport.problemSolvingScore || finalReport.communicationScore) && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-white">Performance Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {finalReport.technicalScore && (
                  <div className="bg-gray-700 p-4 rounded">
                    <div className="text-sm text-gray-400 mb-1">Technical Skills</div>
                    <div className="text-3xl font-bold text-blue-400">{finalReport.technicalScore}/100</div>
                  </div>
                )}
                {finalReport.problemSolvingScore && (
                  <div className="bg-gray-700 p-4 rounded">
                    <div className="text-sm text-gray-400 mb-1">Problem Solving</div>
                    <div className="text-3xl font-bold text-green-400">{finalReport.problemSolvingScore}/100</div>
                  </div>
                )}
                {finalReport.communicationScore && (
                  <div className="bg-gray-700 p-4 rounded">
                    <div className="text-sm text-gray-400 mb-1">Communication</div>
                    <div className="text-3xl font-bold text-purple-400">{finalReport.communicationScore}/100</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Strengths */}
          {finalReport.strengths && finalReport.strengths.length > 0 && (
            <div className="bg-green-900 bg-opacity-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-green-300 flex items-center">
                <span className="mr-2">✓</span> Your Strengths
              </h3>
              <ul className="space-y-2">
                {finalReport.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-400 mr-2 mt-1">•</span>
                    <span className="text-gray-200">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas for Improvement */}
          {finalReport.areasForImprovement && finalReport.areasForImprovement.length > 0 && (
            <div className="bg-yellow-900 bg-opacity-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-yellow-300 flex items-center">
                <span className="mr-2">⚡</span> Areas for Improvement
              </h3>
              <ul className="space-y-2">
                {finalReport.areasForImprovement.map((area, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-400 mr-2 mt-1">•</span>
                    <span className="text-gray-200">{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {finalReport.nextSteps && (
            <div className="bg-blue-900 bg-opacity-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3 text-blue-300 flex items-center">
                <span className="mr-2">→</span> Next Steps
              </h3>
              <p className="text-gray-200">{finalReport.nextSteps}</p>
            </div>
          )}

          {/* Question-by-Question Breakdown */}
          {finalReport.questionEvaluations && finalReport.questionEvaluations.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-white">Detailed Question Analysis</h3>
              <div className="space-y-4">
                {finalReport.questionEvaluations.map((evalData, index) => (
                  <div key={index} className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-400">Question {evalData.questionNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{evalData.score}/100</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                      <div className="bg-gray-600 p-2 rounded text-center">
                        <div className="text-gray-400">Confidence</div>
                        <div className={`font-semibold ${
                          evalData.confidence === 'High' ? 'text-green-400' :
                          evalData.confidence === 'Medium' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>{evalData.confidence}</div>
                      </div>
                      <div className="bg-gray-600 p-2 rounded text-center">
                        <div className="text-gray-400">Clarity</div>
                        <div className={`font-semibold ${
                          evalData.clarity === 'High' ? 'text-green-400' :
                          evalData.clarity === 'Medium' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>{evalData.clarity}</div>
                      </div>
                      <div className="bg-gray-600 p-2 rounded text-center">
                        <div className="text-gray-400">Technical</div>
                        <div className={`font-semibold ${
                          evalData.technicalUnderstanding === 'High' ? 'text-green-400' :
                          evalData.technicalUnderstanding === 'Medium' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>{evalData.technicalUnderstanding}</div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-300 leading-relaxed">{evalData.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interview Metadata */}
          {(finalReport.duration || finalReport.completedAt) && (
            <div className="bg-gray-800 p-4 rounded-lg text-sm text-gray-400 flex justify-between">
              {finalReport.duration && (
                <div>Duration: {finalReport.duration} minutes</div>
              )}
              {finalReport.completedAt && (
                <div>Completed: {new Date(finalReport.completedAt).toLocaleString()}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewSession;