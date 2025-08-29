import { AssemblyAI } from "assemblyai";
import { WebSocketServer } from "ws";
import { getHandler } from "./server.js";

class AssemblySocketHandler {
  constructor(userId, interviewWS, interviewHandler) {
    this.userId = userId;
    this.interviewWS = interviewWS;         // frontend WS
    this.interviewHandler = interviewHandler; // backend handler

    this.transcriber = null;
    this.isConnected = false;
    this.isConnecting = false;
    this._everConnected = false;
    this.audioBuffer = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
    this.connectionPromise = null;

    // Flags
    this.isTTSPlaying = false;
    this.pendingTranscript = null;
    this.lastTranscript = ""; // full accumulated transcript
    this.previousTurnTranscript = ""; // last turn text
    this.hasSubmittedForCurrentQuestion = false; // Track if response was already sent
  }

  async initializeTranscriber() {
    if (this.isConnecting || this.isConnected) await this.close();
    this.isConnecting = true;
    this._everConnected = false;
    this.hasSubmittedForCurrentQuestion = false; // Reset on new transcription

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        this.transcriber = this.client.streaming.transcriber({ 
          sampleRate: 16000, 
          formatTurns: true,
          endUtteranceSilenceThreshold: 2000 // Increase silence threshold
        });

        this.transcriber.on("open", () => {
          this._everConnected = true;
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.lastTranscript = ""; // Reset transcript for new question
          this.previousTurnTranscript = "";
          this.flushAudioBuffer();
          resolve();
        });

        this.transcriber.on("partial", (partial) => {
          // Send partial transcripts to frontend for live display
          if (this.ws?.readyState === 1) {
            this.ws.send(JSON.stringify({
              type: "transcript",
              text: partial.text,
              isFinal: false
            }));
          }
        });

        this.transcriber.on("turn", (turn) => {
          if (turn.transcript) this.onTranscriptReceived(turn);
        });

        this.transcriber.on("error", (err) => {
          console.error("AssemblyAI error:", err);
          this.isConnecting = false;
          this.isConnected = false;
          reject(err);
        });

        this.transcriber.on("close", () => {
          this.isConnecting = false;
          this.isConnected = false;
          this.audioBuffer = [];
          if (this.reconnectAttempts++ < this.maxReconnectAttempts) {
            const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
            setTimeout(() => this.initializeTranscriber().catch(() => {}), delay);
          }
        });

        await this.transcriber.connect();
      } catch (err) {
        this.isConnecting = false;
        this.isConnected = false;
        reject(err);
      }
    });

    return this.connectionPromise;
  }

  sendAudio(data) {
    if (!data?.byteLength) return;
    
    // Don't send audio if TTS is playing
    if (this.isTTSPlaying) return;
    
    if (this.isConnected && this.transcriber) {
      try {
        const buffer = data instanceof ArrayBuffer ? data : new Uint8Array(data).buffer;
        this.transcriber.sendAudio(buffer);
      } catch {
        this.close().catch(() => {});
      }
    } else if (this.isConnecting) {
      this.audioBuffer.push(data);
      if (this.audioBuffer.length > 50) this.audioBuffer.shift();
    }
  }

  flushAudioBuffer() {
    if (this.audioBuffer.length && this.isConnected && !this.isTTSPlaying) {
      const chunks = [...this.audioBuffer];
      this.audioBuffer = [];
      chunks.forEach((chunk) => this.sendAudio(chunk));
    }
  }

  async close() {
    this.isConnecting = this.isConnected = false;
    this.reconnectAttempts = 0;

    // DON'T automatically send transcript on close
    // Let the frontend control when to submit

    if (this.transcriber && this._everConnected) {
      try { this.transcriber._ws?.removeAllListeners("error"); } catch {}
      try { await this.transcriber.close(); } catch {}
    }

    this.transcriber = null;
    this.connectionPromise = null;
    this.audioBuffer = [];
    this.lastTranscript = "";
    this.previousTurnTranscript = "";
    this.hasSubmittedForCurrentQuestion = false;
  }

  setTTSPlaying(isPlaying) {
    this.isTTSPlaying = isPlaying;
    
    if (isPlaying) {
      // Clear any pending audio when TTS starts
      this.audioBuffer = [];
      // Reset transcript when new question starts
      this.lastTranscript = "";
      this.previousTurnTranscript = "";
      this.hasSubmittedForCurrentQuestion = false;
    }
  }

  onTranscriptReceived(turn) {
    // Only process if TTS is not playing
    if (this.isTTSPlaying) return;

    let newText = turn.transcript;

    // Remove overlap from previous turn
    if (this.previousTurnTranscript && newText.startsWith(this.previousTurnTranscript)) {
      newText = newText.slice(this.previousTurnTranscript.length).trim();
    }

    if (newText) {
      this.lastTranscript += " " + newText;
      this.lastTranscript = this.lastTranscript.trim();
    }
    
    this.previousTurnTranscript = turn.transcript;

    // Send live transcript to frontend
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify({
        type: "transcript",
        text: this.lastTranscript,
        isFinal: false
      }));
    }

    // DON'T automatically submit on turn end
    // The frontend will control submission via the close() method
  }
}

// ---------------------------
// Create Assembly WS
// ---------------------------
export const createAssemblySocket = (getInterviewWS) => {
  if (!process.env.ASSEMBLYAI_API_KEY) throw new Error("Missing API key");

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, req) => {
    const userId = req.user._id;
    const interviewRecord = getInterviewWS(userId);

    if (!interviewRecord) {
      console.error("No active interview found for user", userId);
      ws.close();
      return;
    }

    const { ws: interviewWS, handler: interviewHandler } = interviewRecord;

    // Pass both frontend WS and backend handler
    const handler = new AssemblySocketHandler(userId, interviewWS, interviewHandler);
    handler.ws = ws;

    handler.initializeTranscriber()
      .then(() => {
        if (ws.readyState === 1)
          ws.send(JSON.stringify({ type: "connection", status: "connected" }));
      })
      .catch(() => {
        if (ws.readyState === 1)
          ws.send(JSON.stringify({ type: "error", message: "Init failed" }));
      });

    ws.on("close", async () => await handler.close());
    ws.on("error", async () => await handler.close());

    ws.on("message", (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.type === "tts_start") {
          handler.setTTSPlaying(true);
        } else if (parsed.type === "tts_end") {
          handler.setTTSPlaying(false);
        } else if (parsed.audioData) {
          handler.sendAudio(parsed.audioData);
        }
      } catch {
        // Assume it's raw audio data
        handler.sendAudio(msg);
      }
    });
  });

  return wss;
};