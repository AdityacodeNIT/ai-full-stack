import { useEffect, useState, useRef } from 'react';

const InterviewSession = ({ interviewId }) => {
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [finalReport, setFinalReport] = useState(null); // 🆕

  const interviewSocket = useRef(null);
  const assemblySocket = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const speak = (text) =>
    new Promise((resolve) => {
      speechSynthesis.cancel();

      const speakNow = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';

        utterance.onend = () => {
          console.log('🔊 TTS finished.');
          resolve();
        };

        utterance.onerror = (err) => {
          console.error('❌ TTS error:', err);
          resolve();
        };

        speechSynthesis.speak(utterance);
      };

      if (speechSynthesis.getVoices().length > 0) {
        speakNow();
      } else {
        speechSynthesis.onvoiceschanged = () => speakNow();
      }

      setTimeout(() => {
        if (!speechSynthesis.speaking) {
          console.warn('⚠️ TTS timeout: forcing resolve');
          resolve();
        }
      }, 7000);
    });

  const stopAssemblyTranscription = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (assemblySocket.current?.readyState === WebSocket.OPEN) {
      assemblySocket.current.close();
    }
    setIsTranscribing(false);
    console.log('🛑 Stopped transcription.');

    if (transcript.trim()) {
      console.log('✅ Sending manual response:', transcript.trim());
      interviewSocket.current?.send(
        JSON.stringify({ type: 'response', response: transcript.trim() })
      );
    }
  };

  const startAssemblyTranscription = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

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
          }
        };
        recorder.start(250);
      };

      socket.onmessage = (e) => {
        const { text } = JSON.parse(e.data);
        console.log('📜 Transcribed:', text);
        setTranscript(text);
      };

      socket.onerror = (err) => {
        console.error('AssemblyAI WebSocket error:', err);
        setError('Transcription WebSocket error');
        stopAssemblyTranscription();
      };

      socket.onclose = () => console.log('🔴 Assembly WebSocket closed');
      assemblySocket.current = socket;
    } catch (err) {
      console.error('🎙️ Mic access error:', err);
      setError('Microphone access denied');
    }
  };

  const handleNewQuestion = async (newQuestion) => {
    stopAssemblyTranscription();
    setTranscript('');
    setQuestion(newQuestion);
    await speak(newQuestion);
    await new Promise((r) => setTimeout(r, 500));
    startAssemblyTranscription();
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
        setError("Authentication token not found. Please log in again.");
        return;
    }

    const wsUrl = `${import.meta.env.VITE_WS_URL}/ws/interview?token=${token}`;
    interviewSocket.current = new WebSocket(wsUrl);

    interviewSocket.current.onopen = () => {
      console.log('✅ Interview WebSocket connected');
      interviewSocket.current.send(JSON.stringify({ type: 'start', interviewId }));
    };

    interviewSocket.current.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      console.log('📩 Message:', data);

      if (data.type === 'question') {
        await handleNewQuestion(data.question);
      } else if (data.type === 'analysis') {
        setAnalysis(data.analysis);
      } else if (data.type === 'finalReport') {
        setFinalReport(data.report); // 🆕 Save final report
      } else if (data.type === 'end') {
        stopAssemblyTranscription();
        setCompleted(true);
      } else if (data.type === 'error') {
        setError(data.message || 'Error from server');
        stopAssemblyTranscription();
      }
    };

    interviewSocket.current.onerror = (err) => {
      console.error('Interview WS error:', err);
      setError('Interview connection error');
    };

    interviewSocket.current.onclose = () => {
      console.log('🔴 Interview WebSocket closed');
    };

    return () => {
      stopAssemblyTranscription();
      interviewSocket.current?.close();
    };
  }, [interviewId]);

  return (
    <div className="p-6 max-w-xl mx-auto bg-black rounded shadow text-white">
      <h2 className="text-lg font-semibold mb-4">🎤 AI Voice Interview</h2>

      {completed ? (
        <div className="text-green-500 text-xl">✅ Interview completed!</div>
      ) : (
        <>
          <p className="mb-4 text-white">
            🧠 Question: {question || 'Waiting for question…'}
          </p>

          <p className="text-sm text-gray-400">
            {isTranscribing ? '🎙️ Listening…' : '🔇 Not listening'}
          </p>

          {isTranscribing && (
            <button
              onClick={stopAssemblyTranscription}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              ⏹ Stop Answering
            </button>
          )}

          {transcript && (
            <p className="mt-2 italic text-gray-400">🗣️ You: {transcript}</p>
          )}

          {error && (
            <p className="text-red-500 mt-3 font-semibold">⚠️ {error}</p>
          )}

          {analysis && (
            <div className="mt-4 bg-gray-800 p-3 rounded">
              <strong>AI Feedback:</strong>
              <p>{typeof analysis === 'string' ? analysis : analysis.summary}</p>
            </div>
          )}
        </>
      )}

      {finalReport && (
        <div className="mt-6 bg-green-900 p-4 rounded">
          <h3 className="text-lg font-bold text-green-300">📝 Final Summary</h3>
          <p>{finalReport.overall}</p>
        </div>
      )}
    </div>
  );
};

export default InterviewSession;
