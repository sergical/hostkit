/**
 * Web Speech API Wrapper
 * Provides browser-based speech recognition for instant user transcription
 */

// Extend Window interface for webkit prefix
interface Window {
  webkitSpeechRecognition: any
  SpeechRecognition: any
}

export interface SpeechRecognitionResult {
  transcript: string
  isFinal: boolean
  confidence: number
}

export class SpeechRecognitionService {
  private recognition: any = null
  private isListening: boolean = false
  private onResultCallback: ((result: SpeechRecognitionResult) => void) | null = null
  private onStateChangeCallback: ((isListening: boolean) => void) | null = null
  private onErrorCallback: ((error: string) => void) | null = null

  /**
   * Check if speech recognition is supported in this browser
   */
  static isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  }

  /**
   * Initialize speech recognition
   */
  initialize(): void {
    if (!SpeechRecognitionService.isSupported()) {
      console.warn('[SpeechRecognition] Not supported in this browser')
      return
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition

    this.recognition = new SpeechRecognition()

    // Configuration
    this.recognition.continuous = true // Keep listening
    this.recognition.interimResults = true // Get partial results
    this.recognition.lang = 'en-US'
    this.recognition.maxAlternatives = 1

    // Event handlers
    this.recognition.onstart = () => {
      console.log('[SpeechRecognition] Started')
      this.isListening = true
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(true)
      }
    }

    this.recognition.onend = () => {
      console.log('[SpeechRecognition] Ended')
      this.isListening = false
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(false)
      }

      // Auto-restart if we're supposed to be listening
      if (this.isListening) {
        console.log('[SpeechRecognition] Auto-restarting...')
        try {
          this.recognition.start()
        } catch (error) {
          console.error('[SpeechRecognition] Restart error:', error)
        }
      }
    }

    this.recognition.onresult = (event: any) => {
      const results = event.results
      const lastResult = results[results.length - 1]
      const transcript = lastResult[0].transcript
      const isFinal = lastResult.isFinal
      const confidence = lastResult[0].confidence

      console.log('[SpeechRecognition]', isFinal ? '✅ Final:' : '⏳ Interim:', transcript)

      if (this.onResultCallback) {
        this.onResultCallback({
          transcript,
          isFinal,
          confidence,
        })
      }
    }

    this.recognition.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error:', event.error)

      // Handle specific errors
      if (event.error === 'no-speech') {
        console.log('[SpeechRecognition] No speech detected, continuing...')
        return
      }

      if (event.error === 'aborted') {
        console.log('[SpeechRecognition] Aborted, will restart if needed')
        return
      }

      if (this.onErrorCallback) {
        this.onErrorCallback(event.error)
      }
    }

    console.log('[SpeechRecognition] Initialized')
  }

  /**
   * Start listening
   */
  start(): void {
    if (!this.recognition) {
      console.error('[SpeechRecognition] Not initialized')
      return
    }

    if (this.isListening) {
      console.log('[SpeechRecognition] Already listening')
      return
    }

    try {
      this.recognition.start()
      console.log('[SpeechRecognition] Starting...')
    } catch (error) {
      console.error('[SpeechRecognition] Start error:', error)
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (!this.recognition) {
      return
    }

    if (!this.isListening) {
      console.log('[SpeechRecognition] Not listening')
      return
    }

    try {
      this.isListening = false // Set before stopping to prevent auto-restart
      this.recognition.stop()
      console.log('[SpeechRecognition] Stopping...')
    } catch (error) {
      console.error('[SpeechRecognition] Stop error:', error)
    }
  }

  /**
   * Set callback for when transcription results are available
   */
  onResult(callback: (result: SpeechRecognitionResult) => void): void {
    this.onResultCallback = callback
  }

  /**
   * Set callback for when listening state changes
   */
  onStateChange(callback: (isListening: boolean) => void): void {
    this.onStateChangeCallback = callback
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback
  }

  /**
   * Check if currently listening
   */
  getIsListening(): boolean {
    return this.isListening
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.recognition) {
      this.stop()
      this.recognition = null
    }
    this.onResultCallback = null
    this.onStateChangeCallback = null
    this.onErrorCallback = null
    console.log('[SpeechRecognition] Destroyed')
  }
}
