/**
 * Browser Audio Processing Utilities
 * Handles microphone capture, PCM conversion, and audio playback for Gemini Live API
 */

export interface AudioLevelInfo {
  rms: number // Root Mean Square (0-1)
  isSpeaking: boolean // True if above speech threshold
  chunksSent: number
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private mediaStream: MediaStream | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private analyserNode: AnalyserNode | null = null
  private onAudioDataCallback: ((data: string) => void) | null = null
  private onAudioLevelCallback: ((info: AudioLevelInfo) => void) | null = null
  private chunksSent: number = 0
  private speechThreshold: number = 0.01 // RMS threshold for speech detection

  /**
   * Initialize audio context and request microphone access
   */
  async initialize(): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)()

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono
          sampleRate: 16000, // 16kHz (Gemini requirement)
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Create source node from microphone
      this.sourceNode = this.audioContext.createMediaStreamSource(
        this.mediaStream,
      )

      // Create analyser for visualization
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 2048
      this.analyserNode.smoothingTimeConstant = 0.8

      // Create processor node for capturing audio data
      const bufferSize = 4096
      this.processorNode = this.audioContext.createScriptProcessor(
        bufferSize,
        1,
        1,
      )

      this.processorNode.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0)

        // Calculate RMS (Root Mean Square) for audio level
        let sum = 0
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i]
        }
        const rms = Math.sqrt(sum / inputData.length)
        const isSpeaking = rms > this.speechThreshold

        // Convert to PCM and send
        const pcmData = this.convertToPCM16(inputData)
        const base64Data = this.arrayBufferToBase64(pcmData)

        this.chunksSent++

        if (this.onAudioDataCallback) {
          this.onAudioDataCallback(base64Data)
        }

        // Notify about audio level (throttle to every 5th chunk)
        if (this.onAudioLevelCallback && this.chunksSent % 5 === 0) {
          this.onAudioLevelCallback({
            rms,
            isSpeaking,
            chunksSent: this.chunksSent,
          })
        }
      }

      // Connect audio graph: source -> analyser -> processor -> destination
      this.sourceNode.connect(this.analyserNode)
      this.analyserNode.connect(this.processorNode)
      this.processorNode.connect(this.audioContext.destination)

      console.log('[Audio] Initialized successfully')
    } catch (error) {
      console.error('[Audio] Initialization error:', error)
      throw error
    }
  }

  /**
   * Convert Float32Array audio data to PCM 16-bit
   */
  private convertToPCM16(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2)
    const view = new DataView(buffer)

    for (let i = 0; i < float32Array.length; i++) {
      // Convert float [-1, 1] to 16-bit integer [-32768, 32767]
      const sample = Math.max(-1, Math.min(1, float32Array[i]))
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(i * 2, int16, true) // true = little-endian
    }

    return buffer
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Play audio received from Gemini (base64 PCM 16-bit, 24kHz)
   */
  async playAudio(base64Audio: string): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    try {
      const arrayBuffer = this.base64ToArrayBuffer(base64Audio)
      const audioBuffer = await this.decodePCM16ToAudioBuffer(arrayBuffer, 24000)

      const sourceNode = this.audioContext.createBufferSource()
      sourceNode.buffer = audioBuffer
      sourceNode.connect(this.audioContext.destination)
      sourceNode.start()
    } catch (error) {
      console.error('[Audio] Playback error:', error)
    }
  }

  /**
   * Decode PCM 16-bit to AudioBuffer
   * @param arrayBuffer - Raw PCM data
   * @param sampleRate - Sample rate of the audio (16000 for input, 24000 for Gemini output)
   */
  private async decodePCM16ToAudioBuffer(
    arrayBuffer: ArrayBuffer,
    sampleRate: number = 16000,
  ): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    const numSamples = arrayBuffer.byteLength / 2 // 2 bytes per sample
    const audioBuffer = this.audioContext.createBuffer(
      1,
      numSamples,
      sampleRate,
    )
    const channelData = audioBuffer.getChannelData(0)
    const view = new DataView(arrayBuffer)

    for (let i = 0; i < numSamples; i++) {
      const int16 = view.getInt16(i * 2, true) // true = little-endian
      channelData[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff) // Convert to float [-1, 1]
    }

    return audioBuffer
  }

  /**
   * Get analyser node for visualization
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode
  }

  /**
   * Set callback for when audio data is captured
   */
  onAudioData(callback: (data: string) => void): void {
    this.onAudioDataCallback = callback
  }

  /**
   * Set callback for audio level updates
   */
  onAudioLevel(callback: (info: AudioLevelInfo) => void): void {
    this.onAudioLevelCallback = callback
  }

  /**
   * Get current chunks sent count
   */
  getChunksSent(): number {
    return this.chunksSent
  }

  /**
   * Stop audio processing and release resources
   */
  stop(): void {
    if (this.processorNode) {
      this.processorNode.disconnect()
      this.processorNode = null
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect()
      this.analyserNode = null
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect()
      this.sourceNode = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.onAudioDataCallback = null
    this.onAudioLevelCallback = null
    this.chunksSent = 0
    console.log('[Audio] Stopped and cleaned up')
  }
}
