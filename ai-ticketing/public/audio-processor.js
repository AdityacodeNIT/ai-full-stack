class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isProcessing = false;
    this.sampleRate = 16000;
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    
    this.port.onmessage = this.handleMessage.bind(this);
  }

  handleMessage(event) {
    const { command } = event.data;
    if (command === 'start') {
      this.isProcessing = true;
    } else if (command === 'stop') {
      this.isProcessing = false;
      this.bufferIndex = 0;
    }
  }

  process(inputs) {
    if (!this.isProcessing || !inputs[0] || !inputs) {
      return true;
    }

    const input = inputs;
    
    for (let i = 0; i < input.length; i++) {
      this.buffer[this.bufferIndex++] = input[i];
      
      if (this.bufferIndex >= this.bufferSize) {
        // Convert to 16-bit PCM
        const pcmBuffer = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          pcmBuffer[j] = Math.max(-1, Math.min(1, this.buffer[j])) * 0x7FFF;
        }
        
        this.port.postMessage({
          audioData: pcmBuffer.buffer
        });
        
        this.bufferIndex = 0;
      }
    }
    
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
