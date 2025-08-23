import { useEffect, useState, useRef, useCallback } from 'react';

const InterviewSession = ({ interviewId }) => {
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [finalReport, setFinalReport] = useState(null);

  const interviewSocket = useRef(null);
  const assemblySocket = useRef(null);
  const audioContextRef = useRef(null);
  const audioWorkletNodeRef = useRef(null);
  const mediaStreamSourceRef = useRef(null);
  const partialTranscriptRef = useRef('');

  // Text-to-Speech
  const speak = useCallback(
    (text) =>
      new Promise((resolve) => {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve(); // Don't block on TTS error
        speechSynthesis.speak(utterance);
      }),
    []
  );

  // Stop transcription and clean up resources
  const stopAssemblyTranscription = useCallback(() => {
    if (!isTranscribing) return;

    setIsTranscribing(false);
    console.log('🛑 Stopping transcription...');

    // Stop audio worklet
    audioWorkletNodeRef.current?.port.postMessage({ command: 'stop' });

    // Disconnect and close audio context
    mediaStreamSourceRef.current?.disconnect();
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }

    // Close AssemblyAI socket
    if (assemblySocket.current?.readyState === WebSocket.OPEN) {
      assemblySocket.current.close();
    }

    // Send final response if there's a transcript
    const finalTranscript = partialTranscriptRef.current.trim();
    if (finalTranscript) {
      console.log('✅ Sending final response:', finalTranscript);
      interviewSocket.current?.send(
        JSON.stringify({ type: 'response', response: finalTranscript })
      );
      partialTranscriptRef.current = '';
      setTranscript('');
    }
  }, [isTranscribing]);

  // Start transcription
  const startAssemblyTranscription = useCallback(async () => {
    if (isTranscribing) return;

    console.log('🚀 Starting transcription...');
    setError(null);
    partialTranscriptRef.current = '';

    try {
      // 1. Get user media with fallback
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error('🎤 Microphone permission denied:', err);
        setError('Microphone access denied or unavailable.');
        return;
      }

      // 2. Setup AudioContext and Worklet
      const context = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = context;

      // Resume AudioContext if suspended (autoplay policy)
      if (context.state === 'suspended') await context.resume();

      await context.audioWorklet.addModule('/audio-processor.js');
      const workletNode = new AudioWorkletNode('audio-processor', {
        processorOptions: { sampleRate: context.sampleRate },
      });
      audioWorkletNodeRef.current = workletNode;

      // 3. Connect audio source to worklet
      const source = context.createMediaStreamSource(stream);
      mediaStreamSourceRef.current = source;
      source.connect(workletNode).connect(context.destination);

      // 4. Setup AssemblyAI WebSocket
      const socket = new WebSocket(`${import.meta.env.VITE_WS_URL}/assembly`);
      assemblySocket.current = socket;
      socket.binaryType = 'arraybuffer';

      socket.onopen = () => {
        console.log('✅ AssemblyAI WebSocket connected');
        workletNode.port.postMessage({ command: 'start' });
        setIsTranscribing(true);
      };

      // 5. Listen for audio data from worklet and send to socket
      workletNode.port.onmessage = (event) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(event.data.audioData);
        }
      };

      // 6. Handle transcripts from AssemblyAI
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.text) {
          if (data.isFinal) {
            partialTranscriptRef.current = `${partialTranscriptRef.current} ${data.text}`.trim();
            setTranscript(partialTranscriptRef.current);
          } else {
            setTranscript(`${partialTranscriptRef.current} ${data.text}`.trim());
          }
        }
      };

      socket.onerror = () => setError('Transcription connection error.');
      socket.onclose = () => console.log('🔴 AssemblyAI WebSocket closed');
    } catch (err) {
      console.error('🎤 Audio Worklet or WebSocket error:', err);
      setError('Microphone or transcription error.');
      stopAssemblyTranscription();
    }
  }, [isTranscribing, stopAssemblyTranscription]);

  // Handle incoming questions
  const handleNewQuestion = useCallback(
    async (newQuestion) => {
      setQuestion(newQuestion);
      setAnalysis(null);
      setTranscript('');
      partialTranscriptRef.current = '';
      await speak(newQuestion);
      await startAssemblyTranscription();
    },
    [speak, startAssemblyTranscription]
  );

  // Main interview WebSocket logic
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication token not found.');
      return;
    }

    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws/interview?token=${token}`;
    interviewSocket.current = new WebSocket(wsUrl);

    interviewSocket.current.onopen = () => {
      console.log('✅ Interview WebSocket connected');
      interviewSocket.current.send(JSON.stringify({ type: 'start', interviewId }));
    };

    interviewSocket.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      switch (data.type) {
        case 'question':
          handleNewQuestion(data.question);
          break;
        case 'analysis':
          setAnalysis(data.analysis);
          break;
        case 'finalReport':
          setFinalReport(data.report);
          break;
        case 'end':
          stopAssemblyTranscription();
          setCompleted(true);
          break;
        case 'error':
          setError(data.message || 'An unknown error occurred.');
          stopAssemblyTranscription();
          break;
      }
    };

    interviewSocket.current.onerror = () => setError('Interview connection error.');
    interviewSocket.current.onclose = () => console.log('🔴 Interview WebSocket closed');

    return () => {
      stopAssemblyTranscription();
      interviewSocket.current?.close();
    };
  }, [interviewId, handleNewQuestion, stopAssemblyTranscription]);

  return (
    <div className="p-6 max-w-2xl mx-auto bg-gray-900 rounded-lg shadow-xl text-white font-sans">
      <h2 className="text-2xl font-bold mb-4 text-cyan-400">🎤 AI Voice Interview</h2>

      {completed ? (
        <div className="text-green-400 text-xl">✅ Interview completed!</div>
      ) : (
        <>
          <div className="mb-4 p-4 bg-gray-800 rounded-lg">
            <p className="font-semibold text-lg text-gray-200">
              🧠 Question: <span className="font-normal">{question || 'Waiting for question…'}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3 my-4">
            <div className={`w-4 h-4 rounded-full ${isTranscribing ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></div>
            <p className="text-sm text-gray-400">
              {isTranscribing ? 'Listening…' : 'Not listening'}
            </p>
          </div>

          {isTranscribing && (
            <button
              onClick={stopAssemblyTranscription}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              ⏹️ Stop Answering
            </button>
          )}

          {transcript && (
            <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-lg">
              <p className="italic text-gray-300">🗣️ You: {transcript}</p>
            </div>
          )}
        </>
      )}

      {error && <p className="text-red-400 mt-3 font-semibold">⚠️ {error}</p>}

      {analysis && (
        <div className="mt-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
          <strong className="text-cyan-400">AI Feedback:</strong>
          <p className="text-gray-300 mt-1">{typeof analysis === 'string' ? analysis : analysis.summary}</p>
        </div>
      )}

      {finalReport && (
        <div className="mt-6 bg-green-900/50 p-4 rounded-lg border border-green-700">
          <h3 className="text-lg font-bold text-green-300">📝 Final Summary</h3>
          <p className="text-gray-200 mt-2">{finalReport.overall}</p>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;
