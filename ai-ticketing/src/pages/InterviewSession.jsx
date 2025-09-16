import { useEffect, useState, useRef, useCallback } from 'react';
import { getWebSocketToken } from '../utils/websocket.js';

const InterviewSession = ({ interviewId }) => {
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [finalReport, setFinalReport] = useState(null);
  const [status, setStatus] = useState('disconnected');
  const [qIndex, setQIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  
  // NEW: Store all question analyses
  const [questionAnalyses, setQuestionAnalyses] = useState([]);
  const [showPreviousAnalyses, setShowPreviousAnalyses] = useState(false);

  const interviewWS = useRef(null);
  const assemblyWS = useRef(null);
  const audioCtx = useRef(null);
  const workletNode = useRef(null);
  const mediaSource = useRef(null);
  const mediaStream = useRef(null);
  const partial = useRef('');
  const isTranscribingRef = useRef(false);
  const hasSubmittedResponse = useRef(false);

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
  const submitResponse = useCallback(() => {
    const currentTranscript = partial.current.trim();
    
    if (currentTranscript.length > 5 && !hasSubmittedResponse.current && interviewWS.current?.readyState === 1) {
      hasSubmittedResponse.current = true;
      setIsProcessingResponse(true);
      
      console.log('Submitting response:', currentTranscript);
      interviewWS.current.send(JSON.stringify({
        type: 'response',
        response: currentTranscript
      }));
    }
  }, []);

  // --- Stop transcription ---
  const stopTranscription = useCallback((shouldSubmit = true) => {
    if (!isTranscribing) return;

    setIsTranscribing(false);

    if (shouldSubmit && !hasSubmittedResponse.current) {
      submitResponse();
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

    setStatus('disconnected');
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

      const token = await getWebSocketToken();
      const socket = new WebSocket(`${import.meta.env.VITE_WS_URL}/assembly?token=${token}`);
      assemblyWS.current = socket;
      socket.binaryType = 'arraybuffer';

      const timeout = setTimeout(() => {
        setError('AssemblyAI connection timeout');
        stopTranscription(false);
      }, 10000);

      socket.onopen = () => {
        clearTimeout(timeout);
        node.port.postMessage({ command: 'start' });
        setIsTranscribing(true);
        setStatus('connected');

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
        stopTranscription(false);
      };

      socket.onclose = () => setStatus('disconnected');
    } catch (err) {
      setError(`Audio setup failed: ${err.message}`);
      stopTranscription(false);
    }
  }, [isTranscribing, isSpeaking, stopTranscription]);

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

  // --- Manual submit button ---
  const handleManualSubmit = useCallback(() => {
    if (partial.current.trim().length > 5) {
      stopTranscription(true);
    } else {
      setError('Please provide a longer response');
    }
  }, [stopTranscription]);

  // --- Interview WebSocket setup ---
  useEffect(() => {
    if (interviewWS.current) return;

    const setupWebSocket = async () => {
      try {
        const token = await getWebSocketToken();
        const ws = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/interview?token=${token}`);
        interviewWS.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      ws.send(JSON.stringify({ type: 'start', interviewId }));
    };

    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      switch (msg.type) {
        case 'question':
          console.log('New question:', msg);
          handleQuestion(msg.question, msg.questionIndex, msg.totalQuestions);
          break;
        case 'analysis':
          console.log('Analysis:', msg);
          setAnalysis(msg.analysis);
          setIsProcessingResponse(false);
          
          // NEW: Store this analysis with question context
          setQuestionAnalyses(prev => [
            ...prev,
            {
              questionIndex: msg.questionIndex || qIndex,
              question: question,
              response: partial.current,
              analysis: msg.analysis,
              timestamp: new Date()
            }
          ]);
          
          // Process next question after delay
          setTimeout(() => {
            if (questionQueue.current.length > 0) {
              processNextQuestion();
            }
          }, 3000);
          break;
        case 'finalReport':
          setFinalReport(msg.report);
          break;
        case 'end':
          stopTranscription(false);
          setCompleted(true);
          setStatus('completed');
          break;
        case 'error':
          setError(msg.message);
          setIsProcessingResponse(false);
          stopTranscription(false);
          setStatus('error');
          break;
      }
    };

        ws.onerror = () => setError('Interview WS error');
        ws.onclose = () => setStatus('disconnected');

        return () => {
          stopTranscription(false);
          speechSynthesis.cancel();
        };
      } catch (error) {
        console.error('Failed to setup WebSocket:', error);
        setError('Failed to connect to interview service');
      }
    };

    setupWebSocket();
  }, [interviewId, handleQuestion, stopTranscription, processNextQuestion, qIndex, question]);

  return (
    <div className="p-6 bg-gray-900 text-white rounded max-w-4xl mx-auto">
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
          <div className="bg-gray-800 p-4 rounded mb-4">
            <p className="font-semibold">
              Q {qIndex + 1}/{total}: {question || 'Waiting…'}
            </p>
          </div>

          {/* Status indicators */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center">
              <div
                className={`w-4 h-4 rounded-full ${
                  isSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'
                }`}
              />
              <span className="ml-2 text-sm">{isSpeaking ? 'AI Speaking...' : 'Silent'}</span>
            </div>
            
            <div className="flex items-center">
              <div
                className={`w-4 h-4 rounded-full ${
                  isTranscribing ? 'bg-red-500 animate-pulse' : 'bg-gray-600'
                }`}
              />
              <span className="ml-2 text-sm">{isTranscribing ? 'Listening...' : 'Not listening'}</span>
            </div>
          </div>

          {/* Control buttons */}
          {isTranscribing && transcript.length > 10 && (
            <button
              onClick={handleManualSubmit}
              className="bg-green-600 hover:bg-green-700 py-2 px-4 rounded mb-4 mr-2"
              disabled={isProcessingResponse}
            >
              Submit Answer
            </button>
          )}

          {isTranscribing && (
            <button
              onClick={() => stopTranscription(false)}
              className="bg-red-600 hover:bg-red-700 py-2 px-4 rounded mb-4"
            >
              Cancel
            </button>
          )}

          {isProcessingResponse && (
            <div className="text-yellow-400 mb-4">
              Processing your response...
            </div>
          )}

          {/* Live transcript */}
          {transcript && (
            <div className="bg-gray-800 p-3 rounded mb-4">
              <p className="text-sm text-gray-400 mb-1">Your response:</p>
              <p className="italic">{transcript}</p>
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
        <div className="mt-4 bg-green-900 p-4 rounded">
          <strong>Final Report:</strong>
          <p className="mt-2">{finalReport.recommendation}</p>
          
          {/* Display detailed final report */}
          {finalReport.perQuestion && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Question-by-Question Summary:</h4>
              {finalReport.perQuestion.map((q, index) => (
                <div key={index} className="mb-3 p-3 bg-green-800 rounded">
                  <div className="text-sm font-medium mb-1">Q{index + 1}: {q.question}</div>
                  <div className="text-xs text-green-200">{q.summary}</div>
                </div>
              ))}
            </div>
          )}
          
          {finalReport.overallRatings && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>Overall Confidence: {finalReport.overallRatings.confidence}</div>
              <div>Overall Clarity: {finalReport.overallRatings.clarity}</div>
              <div>Leadership: {finalReport.overallRatings.leadership}</div>
              <div>Technical: {finalReport.overallRatings.technicalUnderstanding}</div>
            </div>
          )}
          
          {finalReport.averageScore && (
            <div className="mt-2 text-lg font-bold">
              Average Score: {finalReport.averageScore}/100
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InterviewSession;