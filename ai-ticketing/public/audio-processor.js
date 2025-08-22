// Resamples and sends audio data as 16-bit PCM.
class AudioProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.isProcessing = false;
        this.bufferSize = 2048; // Smaller buffer for lower latency
        this.targetSampleRate = 16000;
        this.sourceSampleRate = options.processorOptions.sampleRate;
        this.resampleRatio = this.sourceSampleRate / this.targetSampleRate;

        this._buffer = new Float32Array(this.bufferSize);
        this._bufferIndex = 0;

        this.port.onmessage = (event) => {
            if (event.data.command === 'start') {
                this.isProcessing = true;
            } else if (event.data.command === 'stop') {
                this.isProcessing = false;
                this.flush(); // Flush any remaining audio
            }
        };

        console.log(`AudioProcessor initialized. Source: ${this.sourceSampleRate}Hz, Target: ${this.targetSampleRate}Hz`);
    }

    // Simple linear interpolation for resampling
    resample(inputBuffer) {
        const outputLength = Math.floor(inputBuffer.length / this.resampleRatio);
        const outputBuffer = new Float32Array(outputLength);
        for (let i = 0; i < outputLength; i++) {
            const index = i * this.resampleRatio;
            const indexPrev = Math.floor(index);
            const indexNext = Math.min(indexPrev + 1, inputBuffer.length - 1);
            const fraction = index - indexPrev;
            outputBuffer[i] = inputBuffer[indexPrev] + (inputBuffer[indexNext] - inputBuffer[indexPrev]) * fraction;
        }
        return outputBuffer;
    }

    process(inputs) {
        if (!this.isProcessing || !inputs[0] || !inputs[0][0]) {
            return true; // Keep processor alive
        }

        const inputData = inputs[0][0]; // Mono channel
        const resampledData = this.resample(inputData);

        for (let i = 0; i < resampledData.length; i++) {
            this._buffer[this._bufferIndex++] = resampledData[i];
            if (this._bufferIndex === this.bufferSize) {
                this.flush();
            }
        }

        return true;
    }

    // Flushes the internal buffer
    flush() {
        if (this._bufferIndex === 0) return;

        const pcmBuffer = new Int16Array(this._bufferIndex);
        for (let i = 0; i < this._bufferIndex; i++) {
            pcmBuffer[i] = Math.max(-1, Math.min(1, this._buffer[i])) * 0x7FFF;
        }

        this.port.postMessage({
            audioData: pcmBuffer.buffer
        }, [pcmBuffer.buffer]); // Transferable object

        this._bufferIndex = 0;
    }
}

registerProcessor('audio-processor', AudioProcessor);
