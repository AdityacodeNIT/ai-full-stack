import React, { useState } from 'react';

const CALL_STATUS = {
  INACTIVE: "INACTIVE",
  ACTIVE: "ACTIVE",
  CONNECTING: "CONNECTING",
  FINISHED: "FINISHED",
};

const statusColors = {
  INACTIVE: "bg-gray-100 text-gray-500",
  ACTIVE: "bg-green-100 text-green-700",
  CONNECTING: "bg-yellow-100 text-yellow-600",
  FINISHED: "bg-red-100 text-red-600",
};

const DEMO_TRANSCRIPT = [
  { speaker: "AI", text: "Welcome to your interview! Ready to begin?", time: "10:01" },
  { speaker: "You", text: "Yes, I am ready.", time: "10:02" },
];


const Agent = ({ username = "Username" }) => {
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [callStatus, setCallStatus] = useState(CALL_STATUS.INACTIVE);
  const [transcript, setTranscript] = useState(DEMO_TRANSCRIPT);
  const [input, setInput] = useState("");


  // Simulate call starting with a transcript message

  const handleCall = () => {
    setCallStatus(CALL_STATUS.CONNECTING);
    setTimeout(() => {
      setCallStatus(CALL_STATUS.ACTIVE);
      setTranscript(transcript => [
        ...transcript,
        { speaker: "AI", text: "Let's get started. Tell me about yourself.", time: "10:03" }
      ]);
    }, 1500);
  };

  // Simulated message sending in transcript (as "You")
  
  const sendMessage = () => {
    if (!input.trim()) return;
    setTranscript([
      ...transcript,
      { speaker: "You", text: input, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setInput("");
    // Demo: have AI respond with a delay
    setTimeout(() => {
      setTranscript(current => [
        ...current,
        { speaker: "AI", text: "Great! Can you elaborate on that?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }, 1200);
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-gradient-to-tr from-blue-50 to-teal-50 rounded-xl shadow-xl px-8 py-8 flex flex-col items-center space-y-8">
      {/* Interviewer Card */}
      <div className="relative flex flex-col items-center bg-white rounded-lg shadow-md px-6 py-6 w-full">
        <div className="relative">
          <img className="rounded-full w-16 h-16 shadow-lg object-cover" src="/ai-avatar.png" alt="AI Interviewer" />
          {isSpeaking && (
            <span className="absolute -right-2 -bottom-2 w-4 h-4 rounded-full bg-teal-400 animate-pulse shadow-md ring-2 ring-white"></span>
          )}
        </div>
        <h3 className="mt-3 text-lg font-semibold text-blue-900">AI Interview</h3>
        <span
          className={`absolute top-2 right-3 text-xs px-4 py-1 rounded-full font-bold uppercase tracking-wide ${statusColors[callStatus]}`}
        >
          {callStatus}
        </span>
      </div>

      {/* User Card */}
      <div className="flex flex-col items-center bg-white rounded-lg shadow-md px-6 py-5 w-full">
        <img className="rounded-full w-16 h-16 object-cover shadow" src="/user-avatar.png" alt="User" />
        <h3 className="mt-3 text-lg font-semibold text-slate-700">{username}</h3>
      </div>

      {/* Transcript Panel */}
      <div className="w-full bg-white rounded-lg shadow-inner px-4 py-4 max-h-60 overflow-y-auto">
        <div className="mb-2 text-sm text-gray-600 font-semibold">Transcript</div>
       {transcript.length > 0 && (
  <div className={`flex items-start mb-3 ${transcript[transcript.length - 1].speaker === "AI" ? "" : "justify-end"}`}>
    {transcript[transcript.length - 1].speaker === "AI" && (
      <img src="/ai-avatar.png" alt="AI" className="w-7 h-7 rounded-full mr-2 mt-px shadow" />
    )}
    <div>
      <div
        className={`px-3 py-2 rounded-lg max-w-[220px] text-sm shadow 
          ${transcript[transcript.length - 1].speaker === "AI"
            ? "bg-blue-50 text-blue-900"
            : "bg-indigo-100 text-indigo-900"}`}
      >
        <span className="font-medium">{transcript[transcript.length - 1].speaker}:</span> {transcript[transcript.length - 1].text}
      </div>
      <div className="text-xs text-gray-400 mt-1 ml-1">{transcript[transcript.length - 1].time}</div>
    </div>
    {transcript[transcript.length - 1].speaker !== "AI" && (
      <img src="/user-avatar.png" alt="You" className="w-7 h-7 rounded-full ml-2 mt-px shadow" />
    )}
  </div>
)}

        {transcript.map((msg, idx) => (
          <div key={idx} className={`flex items-start mb-3 ${msg.speaker === "AI" ? "" : "justify-end"} `}>
            {msg.speaker === "AI" && (
              <img src="/ai-avatar.png" alt="AI" className="w-7 h-7 rounded-full mr-2 mt-px shadow" />
            )}
            <div>
              <div
                className={`px-3 py-2 rounded-lg max-w-[220px] text-sm shadow 
                  ${msg.speaker === "AI"
                    ? "bg-blue-50 text-blue-900"
                    : "bg-indigo-100 text-indigo-900"}`
                }
              >
                <span className="font-medium">{msg.speaker}:</span> {msg.text}
              </div>
              <div className="text-xs text-gray-400 mt-1 ml-1">{msg.time}</div>
            </div>
            {msg.speaker !== "AI" && (
              <img src="/user-avatar.png" alt="You" className="w-7 h-7 rounded-full ml-2 mt-px shadow" />
            )}
          </div>
        ))}
      </div>

      {/* Transcript Input (only when call is ACTIVE) */}
      {callStatus === CALL_STATUS.ACTIVE && (
        <div className="w-full flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-300 text-sm"
            placeholder="Type your reply..."
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow font-semibold text-sm transition disabled:opacity-50"
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      )}

      {/* Call Control */}
      <div className="w-full flex justify-center">
        {callStatus !== CALL_STATUS.ACTIVE ? (
          <button
            onClick={handleCall}
            disabled={callStatus === CALL_STATUS.CONNECTING}
            className={`transition px-6 py-3 rounded-lg text-white text-base tracking-wide font-semibold shadow-md
              ${callStatus === CALL_STATUS.CONNECTING
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"}
            `}
          >
            {callStatus === CALL_STATUS.INACTIVE || callStatus === CALL_STATUS.FINISHED
              ? 'Start Call'
              : callStatus === CALL_STATUS.CONNECTING
                ? 'Connecting...'
                : '...'}
          </button>
        ) : (
          <button
            onClick={() => setCallStatus(CALL_STATUS.FINISHED)}
            className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md transition"
          >
            End Call
          </button>
        )}
      </div>
    </div>
  );
};

export default Agent;
