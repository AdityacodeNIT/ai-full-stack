import { WebSocketServer } from 'ws';
import { AssemblyAI } from 'assemblyai';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { PassThrough } from 'stream';

dotenv.config();
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export function createAssemblySocket() {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws) => {
    console.log('🎤 AssemblyAI socket connected');

    // 1) buffer first few WebM blobs so FFmpeg sees a header
    const webmBuffer = [];
    let input = null, output = null, ffmpegProc = null;

    // 2) PCM framing buffer
    let pcmBuffer = Buffer.alloc(0);

    // 3) flag to gate sendAudio
    let transcriberReady = false;

    // 4) Setup AssemblyAI streamer with TURN formatting
    const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
    const transcriber = client.streaming.transcriber({
      sampleRate: 16000,
      formatTurns: true,    // 🔁 re‑enable turn formatting
    });

    transcriber.on('open', () => {
      console.log('📡 AssemblyAI stream OPEN');
      transcriberReady = true;
    });

    // REMOVE any auto‑close here; we'll close manually on ws.close()
    // transcriber.on('close', ...) -- gone

    // Listen for raw transcript fragments too, if you like:
    transcriber.on('transcript', (data) => {
      console.log('📝 transcript:', data.text);
     
    });

    // THIS is the event you want for speaker turns:
    transcriber.on('turn', (turn) => {
      console.log('🟢 turn event:', turn);
        if (turn.transcript) {

    
        ws.send(JSON.stringify({ text: turn.transcript }));
      }
    });

    transcriber.on('error', (err) => {
      console.error('❌ AssemblyAI ERROR:', err);
    });

    await transcriber.connect();
    console.log('✅ AssemblyAI CONNECTED');

    // 5) Kick off FFmpeg once we have enough WebM chunks
    function startFFmpeg() {
      input = new PassThrough();
      output = new PassThrough();

      const cmd = ffmpeg(input)
        .inputFormat('webm')
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .format('s16le')
        .on('error', (err) => {
          console.error('❌ FFmpeg ERROR:', err.message);
          ws.close();
        });

      cmd.pipe(output);
      ffmpegProc = cmd.ffmpegProc;

      // feed header+init data
      webmBuffer.forEach(c => input.write(c));
      webmBuffer.length = 0;

      // now receive PCM frames
      output.on('data', chunk => {
        const nonZero = chunk.some(b => b !== 0);
        if (!nonZero || !transcriberReady) return;

        pcmBuffer = Buffer.concat([pcmBuffer, chunk]);
        if (pcmBuffer.length >= 3200) {
          console.log(`✉️ sendAudio ${pcmBuffer.length}B`);
          try {
            transcriber.sendAudio(pcmBuffer);
          } catch (e) {
            console.warn('⚠️ sendAudio failed:', e.message);
          }
          pcmBuffer = Buffer.alloc(0);
        }
      });
    }

    // 6) WebSocket input → buffer or pipe
    ws.on('message', (msg, isBinary) => {
      if (!isBinary) return;
      if (!input) {
        webmBuffer.push(msg);
        if (webmBuffer.length >= 4) {
          console.log('✅ Got enough header blobs, starting FFmpeg');
          startFFmpeg();
        }
      } else {
        input.write(msg);
      }
    });

    // 7) Cleanly close everything **only** when the client WS closes
    ws.on('close', () => {
      console.log('🔴 Client socket closed → tearing down');
      if (input) input.end();
      if (output) output.end();
      transcriber.close();            // flush & close AssemblyAI stream
      if (ffmpegProc) ffmpegProc.kill('SIGKILL');
    });
  });

  return wss;
}
