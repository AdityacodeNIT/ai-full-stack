import { WebSocketServer } from "ws";
import { AssemblyAI } from "assemblyai";

export function createAssemblySocket() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (clientWs) => {
    console.log("[Proxy] Client connected to AssemblyAI proxy");

    let transcriber;

    const setupTranscriber = async () => {
      try {
        const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
        transcriber = client.streaming.transcriber({
          sampleRate: 16000,
          wordBoost: ["interview", "experience", "project", "technical"],
          endUtteranceSilenceThreshold: 1000,
        });

        // Handle open connection
        transcriber.on("open", ({ sessionId }) => {
          console.log(`[Proxy] AssemblyAI session opened: ${sessionId}`);
          if (clientWs.readyState === clientWs.OPEN) {
            clientWs.send(JSON.stringify({ type: 'connected', sessionId }));
          }
        });

        // Handle transcriptions
        transcriber.on("transcript", (transcript) => {
          if (transcript.text && clientWs.readyState === clientWs.OPEN) {
            clientWs.send(JSON.stringify({
              text: transcript.text,
              isFinal: transcript.message_type === "FinalTranscript",
            }));
          }
        });

        // Handle errors
        transcriber.on("error", (error) => {
          console.error("[Proxy] AssemblyAI error:", error);
          if (clientWs.readyState === clientWs.OPEN) {
            clientWs.close(1011, "Transcription service error");
          }
        });

        // Handle close
        transcriber.on("close", (code, reason) => {
          console.log(`[Proxy] AssemblyAI closed: ${code} ${reason}`);
          if (clientWs.readyState === clientWs.OPEN) {
            clientWs.close(1000, "Upstream service closed");
          }
        });

        await transcriber.connect();
      } catch (error) {
        console.error("[Proxy] Failed to connect to AssemblyAI:", error);
        clientWs.close(1011, "Failed to connect to transcription service");
      }
    };

    // Client message handler
    clientWs.on("message", (msg, isBinary) => {
      if (isBinary && transcriber) {
        // The frontend now sends raw audio buffer which is what sendAudio expects
        transcriber.sendAudio(msg);
      }
    });

    // Client disconnect handler
    clientWs.on("close", (code, reason) => {
      console.log(`[Proxy] Client disconnected: ${code} ${reason.toString()}`);
      if (transcriber) {
        transcriber.close();
      }
    });

    // Client error handler
    clientWs.on("error", (err) => {
      console.error("[Proxy] Client error:", err);
      if (transcriber) {
        transcriber.close();
      }
    });

    // Initialize the transcriber on connection
    setupTranscriber();
  });

  return wss;
}
