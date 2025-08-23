import { AssemblyAI } from "assemblyai";
import { WebSocketServer } from "ws";

class AssemblySocketHandler {
  constructor(userId, interviewWS) {
    this.userId = userId;
    this.interviewWS = interviewWS;
    this.transcriber = null;
    this.isConnected = false;
    this.isConnecting = false;
    this._everConnected = false;
    this.audioBuffer = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
    this.connectionPromise = null;

    // 🟢 new flags
    this.isTTSPlaying = false;
    this.pendingTranscript = null;
    this.lastTranscript = null;
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

    // forward last partial if we had one but never got a final
    if (this.lastTranscript && this.interviewWS?.readyState === 1) {
      this.interviewWS.send(JSON.stringify({
        type: "response",
        response: this.lastTranscript.trim()
      }));
      console.log("⚡ Sent last partial transcript on close:", this.lastTranscript);
    }

    if (this.transcriber && this._everConnected) {
      try { this.transcriber._ws?.removeAllListeners("error"); } catch {}
      try { await this.transcriber.close(); } catch {}
    }

    this.transcriber = null;
    this.connectionPromise = null;
    this.audioBuffer = [];
  }

  // 🟢 control from your TTS system
  setTTSPlaying(isPlaying) {
    this.isTTSPlaying = isPlaying;
    if (!isPlaying && this.pendingTranscript) {
      if (this.interviewWS?.readyState === 1) {
        this.interviewWS.send(JSON.stringify({
          type: "response",
          response: this.pendingTranscript.trim()
        }));
        console.log("✅ Forwarded delayed transcript after TTS:", this.pendingTranscript);
      }
      this.pendingTranscript = null;
    }
  }

  onTranscriptReceived(turn) {
    // Send live transcript to frontend
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify({
        type: "transcript",
        text: turn.transcript,
        isFinal: turn.end_of_turn === true && turn.turn_is_formatted === true
      }));
    }

    if (turn.end_of_turn === true && turn.turn_is_formatted === true) {
      this.lastTranscript = turn.transcript;

      if (this.isTTSPlaying) {
        // buffer until bot finishes speaking
        this.pendingTranscript = turn.transcript;
        console.log("⏸ Holding transcript until TTS ends:", turn.transcript);
      } else if (this.interviewWS?.readyState === 1) {
        // send immediately
        this.interviewWS.send(JSON.stringify({
          type: "response",
          response: turn.transcript.trim()
        }));
        console.log("✅ Forwarded transcript immediately:", turn.transcript);
        this.lastTranscript = null;
      }
    }
  }
}

// ------------------------------
export const createAssemblySocket = (getInterviewWS) => {
  if (!process.env.ASSEMBLYAI_API_KEY) throw new Error("Missing API key");

  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, req, userId) => {
    const interviewWS = getInterviewWS(userId); // get the correct interviewWS for this user
    const handler = new AssemblySocketHandler(userId, interviewWS);
    handler.ws = ws;

    handler.initializeTranscriber()
      .then(() => ws.readyState === 1 && ws.send(JSON.stringify({ type: "connection", status: "connected" })))
      .catch((err) => ws.readyState === 1 && ws.send(JSON.stringify({ type: "error", message: "Init failed" })));

  
    ws.on("close", async () => await handler.close());
    ws.on("error", async () => await handler.close());

    // expose TTS controls via ws if you want
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
