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
  }

  async initializeTranscriber() {
    if (this.isConnecting || this.isConnected) await this.close();
    this.isConnecting = true;
    this._everConnected = false;

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        this.transcriber = this.client.streaming.transcriber({ sampleRate: 16000, formatTurns: true });

        this.transcriber.on("open", () => {
          this._everConnected = true;
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.flushAudioBuffer();
          resolve();
        });

        this.transcriber.on("turn", (turn) => {
          if (turn.transcript) this.onTranscriptReceived(turn);
        });

        this.transcriber.on("error", (err) => {
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
    if (this.audioBuffer.length && this.isConnected) {
      const chunks = [...this.audioBuffer];
      this.audioBuffer = [];
      chunks.forEach((chunk) => this.sendAudio(chunk));
    }
  }

  async close() {
    this.isConnecting = this.isConnected = false;
    this.reconnectAttempts = 0;

    // Send final transcript
    if (this.lastTranscript) {
      if (this.interviewWS?.readyState === 1) {
        this.interviewWS.send(JSON.stringify({
          type: "response",
          response: this.lastTranscript.trim()
        }));

      }

      if (this.interviewHandler) {
        this.interviewHandler.handleResponse({
          type: "response",
          response: this.lastTranscript.trim()
        }).catch(console.error);
        console.log("✅ Forwarded final transcript to backend handler");
      }
    } else if (this.isTTSPlaying) {
      this.pendingTranscript = this.lastTranscript;
    }

    if (this.transcriber && this._everConnected) {
      try { this.transcriber._ws?.removeAllListeners("error"); } catch {}
      try { await this.transcriber.close(); } catch {}
    }

    this.transcriber = null;
    this.connectionPromise = null;
    this.audioBuffer = [];
  }

  setTTSPlaying(isPlaying) {
    this.isTTSPlaying = isPlaying;
    if (!isPlaying && this.pendingTranscript) {
      if (this.interviewWS?.readyState === 1) {
        this.interviewWS.send(JSON.stringify({
          type: "response",
          response: this.pendingTranscript.trim()
        }));

      }
      this.pendingTranscript = null;
    }
  }

  onTranscriptReceived(turn) {
    let newText = turn.transcript;

    // Remove overlap from previous turn
    if (this.previousTurnTranscript && newText.startsWith(this.previousTurnTranscript)) {
      newText = newText.slice(this.previousTurnTranscript.length).trim();
    }

    if (newText) this.lastTranscript += " " + newText;
    this.previousTurnTranscript = turn.transcript;

    // --- LIVE TRANSCRIPT ---
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify({
        type: "transcript",
        text: newText,
        isFinal: false
      }));
    }

    // --- FINAL TRANSCRIPT AT TURN END ---
    if (turn.end_of_turn) {
      if (!this.isTTSPlaying) {
        if (this.interviewWS?.readyState === 1) {
          this.interviewWS.send(JSON.stringify({
            type: "response",
            response: this.lastTranscript.trim()
          }));
        }

       const handler = getHandler(this.userId);
if (handler) {
   handler.handleResponse({
    type: "response",
    response: this.lastTranscript.trim()
  }).catch(console.error);
        }
      } else {
        this.pendingTranscript = this.lastTranscript;
      }
    }
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
    const interviewRecord = getInterviewWS(userId); // returns { ws, handler }

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
        if (parsed.type === "tts_start") handler.setTTSPlaying(true);
        else if (parsed.type === "tts_end") handler.setTTSPlaying(false);
        else if (parsed.audioData) handler.sendAudio(parsed.audioData);
      } catch {
        handler.sendAudio(msg);
      }
    });
  });

  return wss;
};
