// assemblysocket.js
import { AssemblyAI } from 'assemblyai';
import { WebSocket } from 'ws';

class AssemblySocketHandler {
  constructor() {
    this.transcriber = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.audioBuffer = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectTimeout = null;
    this.client = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY,
    });
    this.connectionPromise = null;
  }

  async initializeTranscriber() {
    if (this.isConnecting || this.isConnected) return this.connectionPromise;
    
    this.isConnecting = true;
    
    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        console.log('🔗 Initializing AssemblyAI transcriber...');

        this.transcriber = this.client.streaming.transcriber({
          sampleRate: 16000,
          formatTurns: true
        });

        // Set up event handlers BEFORE connecting
        this.transcriber.on('open', ({ sessionId }) => {
          console.log('✅ AssemblyAI session opened:', sessionId);
          this.isConnecting = false;
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Send any buffered audio data
          this.flushAudioBuffer();
          resolve();
        });

        this.transcriber.on('error', (error) => {
          console.error('❌ AssemblyAI error:', error);
          this.isConnecting = false;
          this.isConnected = false;
          this.handleConnectionError();
          reject(error);
        });

        this.transcriber.on('close', (code, reason) => {
          console.log('🔴 AssemblyAI session closed:', code, reason);
          this.isConnecting = false;
          this.isConnected = false;
          this.audioBuffer = [];
        });

        this.transcriber.on('turn', (turn) => {
          if (turn.transcript) {
            this.onTranscriptReceived(turn);
          }
        });

        // Connect to AssemblyAI with timeout
        const connectTimeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        await this.transcriber.connect();
        clearTimeout(connectTimeout);
        
      } catch (error) {
        console.error('❌ Failed to initialize transcriber:', error);
        this.isConnecting = false;
        this.handleConnectionError();
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  // Send audio data with proper validation
  sendAudio(audioData) {
    // Validate audio data
    if (!audioData || audioData.length === 0) return;

    if (this.isConnected && this.transcriber) {
      try {
        // Ensure we're sending binary data correctly
        const binaryData = audioData instanceof ArrayBuffer ? 
          audioData : new Uint8Array(audioData).buffer;
        
        this.transcriber.sendAudio(binaryData);
      } catch (error) {
        console.error('❌ Error sending audio:', error);
        this.handleConnectionError();
      }
    } else if (this.isConnecting) {
      // Buffer audio data while connecting (limit buffer size)
      this.audioBuffer.push(audioData);
      
      if (this.audioBuffer.length > 50) {
        this.audioBuffer.shift();
      }
    } else {
      console.warn('⚠️ Transcriber not connected, attempting to reconnect...');
      this.audioBuffer.push(audioData);
      this.initializeTranscriber().catch(console.error);
    }
  }

  // Improved buffer flushing
  flushAudioBuffer() {
    if (this.audioBuffer.length > 0 && this.isConnected && this.transcriber) {
      console.log(`📤 Sending ${this.audioBuffer.length} buffered audio chunks`);
      
      const chunks = [...this.audioBuffer];
      this.audioBuffer = [];
      
      chunks.forEach(chunk => {
        try {
          const binaryData = chunk instanceof ArrayBuffer ? 
            chunk : new Uint8Array(chunk).buffer;
          this.transcriber.sendAudio(binaryData);
        } catch (error) {
          console.error('❌ Error sending buffered audio:', error);
        }
      });
    }
  }

  handleConnectionError() {
    this.isConnecting = false;
    this.isConnected = false;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      
      console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.initializeTranscriber().catch(console.error);
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.audioBuffer = [];
    }
  }

  onTranscriptReceived(turn) {
    console.log('📝 Transcript:', turn.transcript);
  }

  async close() {
    console.log('🔴 Closing AssemblyAI handler...');
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.isConnecting = false;
    this.isConnected = false;
    this.audioBuffer = [];
    this.reconnectAttempts = 0;

    if (this.transcriber) {
      try {
        await this.transcriber.close();
      } catch (error) {
        console.warn('Warning closing transcriber:', error.message);
      }
      this.transcriber = null;
    }
    
    this.connectionPromise = null;
  }
}

// Enhanced WebSocket handler with better error management
export const handleAssemblySocket = (ws, req) => {
  const assemblyHandler = new AssemblySocketHandler();
  let isClientConnected = true;
  
  // Override transcript handler to send to WebSocket client
  assemblyHandler.onTranscriptReceived = (turn) => {
    if (isClientConnected && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'transcript',
          text: turn.transcript,
          isFinal: turn.message_type === 'FinalTranscript'
        }));
      } catch (error) {
        console.error('Error sending transcript to client:', error);
        isClientConnected = false;
      }
    }
  };

  // Initialize transcriber when client connects
  ws.on('open', async () => {
    console.log('🔌 Client WebSocket connected');
    try {
      await assemblyHandler.initializeTranscriber();
    } catch (error) {
      console.error('Failed to initialize transcriber:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to initialize speech recognition'
        }));
      }
    }
  });

  // Handle incoming audio data
  ws.on('message', (data) => {
    try {
      if (data instanceof Buffer || data instanceof ArrayBuffer) {
        // Handle binary audio data
        assemblyHandler.sendAudio(data);
      } else {
        // Handle JSON messages if needed
        const message = JSON.parse(data.toString());
        if (message.type === 'audio' && message.data) {
          const audioData = Buffer.from(message.data, 'base64');
          assemblyHandler.sendAudio(audioData);
        }
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Audio processing error'
        }));
      }
    }
  });

  ws.on('close', async (code, reason) => {
    console.log(`🔌 Client WebSocket disconnected: ${code} ${reason}`);
    isClientConnected = false;
    await assemblyHandler.close();
  });

  ws.on('error', async (error) => {
    console.error('❌ WebSocket error:', error);
    isClientConnected = false;
    await assemblyHandler.close();
  });
  
  return assemblyHandler;
};
