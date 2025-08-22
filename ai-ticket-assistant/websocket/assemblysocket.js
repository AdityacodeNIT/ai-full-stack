import { WebSocketServer } from "ws";
import { AssemblyAI } from "assemblyai";

const MAX_BUFFER_SIZE = 512 * 1024; // 512KB max buffer (reduced)
const FLUSH_INTERVAL = 50; // Flush every 50ms (more frequent)
const CONNECTION_TIMEOUT = 15000; // 15 seconds (reduced)
const MAX_RECONNECT_ATTEMPTS = 3;

export function createAssemblySocket() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", async (clientWs, request) => {
    console.log("[Proxy] 🎤 Client connected to AssemblyAI proxy");

    let assemblyReady = false;
    let audioBufferQueue = [];
    let totalBufferSize = 0;
    let flushTimer = null;
    let connectionTimer = null;
    let isClosing = false;
    let transcriber = null;
    let reconnectAttempts = 0;

    // Validate API key
    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.error("[Proxy] ❌ ASSEMBLYAI_API_KEY not found");
      clientWs.close(1011, "Server configuration error");
      return;
    }

    // Enhanced cleanup function
    async function cleanup(reason = "Unknown") {
      if (isClosing) return;
      isClosing = true;
      
      console.log(`[Proxy] 🧹 Cleaning up: ${reason}`);

      // Stop timers
      if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
      }
      if (connectionTimer) {
        clearTimeout(connectionTimer);
        connectionTimer = null;
      }

      // Clear buffers
      audioBufferQueue = [];
      totalBufferSize = 0;

      // Close transcriber
      if (transcriber) {
        try {
          await transcriber.close();
          console.log("[Proxy] 📴 AssemblyAI transcriber closed");
        } catch (err) {
          console.error("[Proxy] ❌ Error closing transcriber:", err);
        }
        transcriber = null;
      }

      // Close client WebSocket
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.close(1000, reason);
      }
    }

    // FIXED: Improved flush function without .writable check
function flushBuffer() {
  if (!assemblyReady || isClosing || !transcriber) {
    if (audioBufferQueue.length > 0) {
      console.warn(`[Proxy] Dropping ${audioBufferQueue.length} buffers because assemblyReady: ${assemblyReady}`);
      audioBufferQueue = [];
      totalBufferSize = 0;
    }
    return;
  }

  // Don't flush if buffers too small, wait for at least 1600 bytes (~50ms audio at 16kHz/16bit)
  const MIN_CHUNK_SIZE_BYTES = 1600;
  if (totalBufferSize < MIN_CHUNK_SIZE_BYTES) {
    return; // accumulate more data
  }

  try {
    let flushedCount = 0;
    const maxFlushPerCycle = 3;

    let bytesFlushed = 0;
    let chunkBuffers = [];
    // Accumulate buffers until we reach minimum chunk size
    while (audioBufferQueue.length > 0 && bytesFlushed < MIN_CHUNK_SIZE_BYTES && flushedCount < maxFlushPerCycle) {
      const buffer = audioBufferQueue.shift();
      bytesFlushed += buffer.byteLength;
      chunkBuffers.push(buffer);
    }

    if (bytesFlushed >= MIN_CHUNK_SIZE_BYTES) {
      // Concatenate buffers
      const chunk = Buffer.concat(chunkBuffers, bytesFlushed);
      totalBufferSize -= bytesFlushed;
      flushedCount++;

      try {
        transcriber.sendAudio(chunk);
        console.log(`[Proxy] ✅ Flushed ${bytesFlushed} bytes`);
      } catch (writeError) {
        // Put buffers back and stop
        audioBufferQueue = chunkBuffers.concat(audioBufferQueue);
        totalBufferSize += bytesFlushed;
        console.error(`[Proxy] Write error: ${writeError.message}`);
      }
    }
  } catch (err) {
    console.error(`[Proxy] Flush error: ${err}`);
  }
}



    // Connection establishment with retry logic
    async function establishConnection() {
      if (isClosing) return false;

      try {
        console.log(`[Proxy] 🔌 Connecting to AssemblyAI (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

        const client = new AssemblyAI({
          apiKey: process.env.ASSEMBLYAI_API_KEY,
        });

        transcriber = client.streaming.transcriber({
          sampleRate: 16000,
          wordBoost: ["interview", "experience", "project", "technical"],
          endUtteranceSilenceThreshold: 1000,
        });

        // Set connection timeout
        connectionTimer = setTimeout(() => {
          if (!assemblyReady && !isClosing) {
            console.error("[Proxy] ⏰ Connection timeout");
            cleanup("Connection timeout");
          }
        }, CONNECTION_TIMEOUT);

        // Connection opened successfully
        transcriber.on("open", ({ id }) => {
          if (isClosing) return;
          
          console.log(`[Proxy] ✅ AssemblyAI session opened: ${id}`);
          assemblyReady = true;
          reconnectAttempts = 0; // Reset on successful connection
          
          if (connectionTimer) {
            clearTimeout(connectionTimer);
            connectionTimer = null;
          }
          
          // Start flushing
          if (!flushTimer) {
            flushTimer = setInterval(flushBuffer, FLUSH_INTERVAL);
          }
          
          // Send connection confirmation
          if (clientWs.readyState === clientWs.OPEN) {
            clientWs.send(JSON.stringify({ 
              type: 'connected', 
              sessionId: id,
              timestamp: Date.now() 
            }));
          }
        });

        // Handle transcription results (CORRECT EVENT NAME)
        transcriber.on("transcript", (transcript) => {
          if (isClosing || clientWs.readyState !== clientWs.OPEN) return;
          
          if (transcript.text?.trim()) {
            try {
              clientWs.send(JSON.stringify({ 
                text: transcript.text,
                confidence: transcript.confidence || 0.8,
                isFinal: transcript.message_type === "FinalTranscript"
              }));
              console.log(`[Proxy] 📝 Transcript: ${transcript.text.substring(0, 50)}...`);
            } catch (err) {
              console.error("[Proxy] ❌ Error sending transcript:", err);
            }
          }
        });

        // Handle errors
        transcriber.on("error", (error) => {
          console.error("[Proxy] ❌ AssemblyAI error:", error);
          assemblyReady = false;
          
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !isClosing) {
            reconnectAttempts++;
            console.log(`[Proxy] 🔄 Attempting reconnection in 2s...`);
            setTimeout(() => establishConnection(), 2000);
          } else {
            cleanup("Max reconnection attempts reached");
          }
        });

        // Handle close
        transcriber.on("close", (code, reason) => {
          console.log(`[Proxy] 🔴 AssemblyAI closed: ${code} ${reason}`);
          assemblyReady = false;
          
          if (!isClosing && code !== 1000) {
            console.log("[Proxy] 🔄 Unexpected close, attempting reconnection...");
            setTimeout(() => establishConnection(), 1000);
          }
        });

        // Actually connect
        await transcriber.connect();
        return true;

      } catch (error) {
        console.error("[Proxy] ❌ Connection failed:", error);
        assemblyReady = false;
        
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !isClosing) {
          reconnectAttempts++;
          console.log(`[Proxy] 🔄 Retrying connection in 3s...`);
          setTimeout(() => establishConnection(), 3000);
        } else {
          cleanup("Failed to establish connection");
        }
        return false;
      }
    }

    // Client message handler
    clientWs.on("message", (msg, isBinary) => {
      if (isClosing) return;

      if (isBinary) {
        // Drop audio if not connected
        if (!assemblyReady) {
          console.warn("[Proxy] ⚠️ Dropping audio - not connected to AssemblyAI");
          return;
        }

        // Buffer management
        if (totalBufferSize + msg.byteLength > MAX_BUFFER_SIZE) {
          console.warn("[Proxy] ⚠️ Buffer overflow, clearing queue");
          audioBufferQueue = [];
          totalBufferSize = 0;
        }

        audioBufferQueue.push(msg);
        totalBufferSize += msg.byteLength;
        
        // Immediate flush for small queues
        if (audioBufferQueue.length <= 2) {
          flushBuffer();
        }
      }
    });

    // Client disconnect
    clientWs.on("close", (code, reason) => {
      console.log(`[Proxy] 🔴 Client disconnected: ${code} ${reason}`);
      cleanup("Client disconnected");
    });

    clientWs.on("error", (err) => {
      console.error("[Proxy] ❌ Client error:", err);
      cleanup("Client error");
    });

    // Start initial connection
    await establishConnection();
  });

  return wss;
}
