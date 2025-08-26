import { useEffect, useState, useRef, useCallback } from 'react';

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

  const interviewWS = useRef(null);
  const assemblyWS = useRef(null);
  const audioCtx = useRef(null);
  const workletNode = useRef(null);
  const mediaSource = useRef(null);
  const mediaStream = useRef(null);
  const partial = useRef('');
  const isTranscribingRef = useRef(false);

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
      new Promise((res) => {
        if (!text) return res();

        sendAssemblyMsg({ type: 'tts_start' });

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;

        utterance.onend = () => {
          sendAssemblyMsg({ type: 'tts_end' });
          res();
        };

        utterance.onerror = () => {
          sendAssemblyMsg({ type: 'tts_end' });
          res();
        };

        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      }),
    []
  );

  // --- Stop transcription ---
  const stopTranscription = useCallback(() => {
    if (!isTranscribing) return;

    setIsTranscribing(false);

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

    // 👇 NEW: continue if more questions waiting

  }, [isTranscribing]); // ✅ removed processNextQuestion from deps to avoid recursion

  // --- Start transcription ---
  const startTranscription = useCallback(async () => {
    if (isTranscribing) return;
    setError(null);
    partial.current = '';

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

      const token = localStorage.getItem('token');
      const socket = new WebSocket(`${import.meta.env.VITE_WS_URL}/assembly?token=${token}`);
      assemblyWS.current = socket;
      socket.binaryType = 'arraybuffer';

      const timeout = setTimeout(() => {
        setError('AssemblyAI connection timeout');
        stopTranscription();
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
        if (d.text) {
          if (d.isFinal) {
            partial.current += ` ${d.text}`;
            setTranscript(partial.current.trim());
                stopTranscription();
          } else {
            setTranscript((partial.current + ` ${d.text}`).trim());
          }
        }
      };

      socket.onerror = () => {
        setError('Transcription error');
        stopTranscription();
      };

      socket.onclose = () => setStatus('disconnected');
    } catch (err) {
      setError(`Audio setup failed: ${err.message}`);
      stopTranscription();
    }
  }, [isTranscribing, stopTranscription]);

  // --- Process next question in queue ---
  const processNextQuestion = useCallback(async () => {
    if (isTranscribing||questionQueue.current.length === 0) return;

    const { q, idx, tot } = questionQueue.current.shift();

    setQuestion(q);
    setQIndex(idx);
    setTotal(tot);
    setAnalysis(null);
    setTranscript('');
    partial.current = '';

    await startTranscription();
    await speak(q);
      const checkNext = setInterval(() => {
      if (!isTranscribing && questionQueue.current.length > 0) {
        clearInterval(checkNext);
        processNextQuestion();
      }
    }, 1500);
    
  }, [startTranscription, speak]);

  // --- Handle new question ---
  const handleQuestion = useCallback(
    (q, idx, tot) => {
      if (processedQuestions.current.has(idx)) return;
      processedQuestions.current.add(idx);
      questionQueue.current.push({ q, idx, tot });

      if (!isTranscribingRef.current) {
        processNextQuestion();
      }
    },
    [processNextQuestion]
  );

  // --- Interview WebSocket setup ---
  useEffect(() => {
    if (interviewWS.current) return;

    const token = localStorage.getItem('token');
    if (!token) return setError('Token missing');

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
          // ❌ removed redundant processNextQuestion here
          break;
        case 'analysis':
          console.log('Analysis:', msg);
          setAnalysis(msg.analysis);
          break;
        case 'finalReport':
          setFinalReport(msg.report);
          break;
        case 'end':
          stopTranscription();
          setCompleted(true);
          setStatus('completed');
          break;
        case 'error':
          setError(msg.message);
          stopTranscription();
          setStatus('error');
          break;
      }
    };

    ws.onerror = () => setError('Interview WS error');
    ws.onclose = () => setStatus('disconnected');

    return () => {
      stopTranscription();
    };
  }, [interviewId, handleQuestion, stopTranscription]);

  return (
    <div className="p-6 bg-gray-900 text-white rounded max-w-xl mx-auto">
      <div className="flex items-center mb-4">
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

      <h2 className="text-2xl mb-4">🎤 AI Voice Interview</h2>

      {completed ? (
        <div className="text-green-400">✅ Interview completed!</div>
      ) : (
        <>
          <div className="bg-gray-800 p-4 rounded mb-4">
            <p className="font-semibold">
              🧠 Q {qIndex + 1}/{total}: {question || 'Waiting…'}
            </p>
          </div>

          <div className="flex items-center mb-4">
            <div
              className={`w-4 h-4 rounded-full ${
                isTranscribing ? 'bg-red-500 animate-pulse' : 'bg-gray-600'
              }`}
            />
            <span className="ml-2 text-sm">{isTranscribing ? 'Listening…' : 'Not listening'}</span>
          </div>

          {isTranscribing && (
            <button
              onClick={stopTranscription}
              className="bg-red-600 py-2 px-4 rounded mb-4"
            >
              ⏹ Stop
            </button>
          )}

          {transcript && (
            <p className="italic bg-gray-800 p-3 rounded">You: {transcript}</p>
          )}
        </>
      )}

      {error && <p className="text-red-400 mt-4">⚠️ {error}</p>}
      {analysis && (
        <div className="mt-4 bg-gray-800 p-4 rounded">
          <strong>Feedback:</strong>
          <p>{analysis.summary || analysis}</p>
        </div>
      )}
      {finalReport && (
        <div className="mt-4 bg-green-900 p-4 rounded">
          <strong>Final Report:</strong>
          <p>{finalReport.recommendation}</p>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;
