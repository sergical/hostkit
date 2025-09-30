/**
 * Audio utility functions for converting between Twilio and Gemini audio formats
 *
 * Twilio sends: μ-law (8kHz, 8-bit, mono) as base64
 * Gemini expects: Linear PCM (16kHz, 16-bit, mono) as base64
 */

/**
 * Convert μ-law encoded audio to Linear PCM
 * @param {Buffer} mulawBuffer - μ-law encoded audio buffer
 * @returns {Buffer} - Linear PCM buffer
 */
export function mulawToPCM(mulawBuffer) {
  // μ-law decompression lookup table
  const MULAW_BIAS = 0x84
  const MULAW_MAX = 0x1fff

  const pcmBuffer = Buffer.alloc(mulawBuffer.length * 2) // 16-bit = 2 bytes per sample

  for (let i = 0; i < mulawBuffer.length; i++) {
    const mulaw = ~mulawBuffer[i]
    const sign = mulaw & 0x80
    const exponent = (mulaw >> 4) & 0x07
    const mantissa = mulaw & 0x0f

    let sample = mantissa << (exponent + 3)
    sample += MULAW_BIAS
    sample <<= exponent

    if (sign) sample = -sample

    // Clamp to 16-bit range
    sample = Math.max(-32768, Math.min(32767, sample))

    // Write as 16-bit little-endian
    pcmBuffer.writeInt16LE(sample, i * 2)
  }

  return pcmBuffer
}

/**
 * Convert Linear PCM to μ-law encoded audio
 * @param {Buffer} pcmBuffer - Linear PCM buffer (16-bit)
 * @returns {Buffer} - μ-law encoded buffer
 */
export function pcmToMulaw(pcmBuffer) {
  const MULAW_BIAS = 0x84

  const mulawBuffer = Buffer.alloc(pcmBuffer.length / 2)

  for (let i = 0; i < pcmBuffer.length; i += 2) {
    let sample = pcmBuffer.readInt16LE(i)

    // Get sign
    const sign = (sample < 0) ? 0x80 : 0x00
    if (sign) sample = -sample

    // Add bias
    sample += MULAW_BIAS

    // Determine exponent and mantissa
    let exponent = 7
    for (let exp = 0x4000; exp > 0; exp >>= 1) {
      if (sample >= exp) break
      exponent--
    }

    const mantissa = (sample >> (exponent + 3)) & 0x0f

    // Compose μ-law byte
    const mulaw = ~(sign | (exponent << 4) | mantissa)

    mulawBuffer[i / 2] = mulaw
  }

  return mulawBuffer
}

/**
 * Resample audio from 8kHz to 16kHz using linear interpolation
 * @param {Buffer} pcmBuffer - PCM audio at 8kHz
 * @returns {Buffer} - PCM audio at 16kHz
 */
export function resample8kTo16k(pcmBuffer) {
  const inputSamples = pcmBuffer.length / 2
  const outputSamples = inputSamples * 2
  const outputBuffer = Buffer.alloc(outputSamples * 2)

  for (let i = 0; i < outputSamples; i++) {
    const sourceIndex = i / 2
    const lowerIndex = Math.floor(sourceIndex)
    const upperIndex = Math.min(lowerIndex + 1, inputSamples - 1)
    const fraction = sourceIndex - lowerIndex

    const lowerSample = pcmBuffer.readInt16LE(lowerIndex * 2)
    const upperSample = pcmBuffer.readInt16LE(upperIndex * 2)

    // Linear interpolation
    const interpolated = Math.round(
      lowerSample * (1 - fraction) + upperSample * fraction
    )

    outputBuffer.writeInt16LE(interpolated, i * 2)
  }

  return outputBuffer
}

/**
 * Resample audio from 16kHz to 8kHz by taking every other sample
 * @param {Buffer} pcmBuffer - PCM audio at 16kHz
 * @returns {Buffer} - PCM audio at 8kHz
 */
export function resample16kTo8k(pcmBuffer) {
  const inputSamples = pcmBuffer.length / 2
  const outputSamples = Math.floor(inputSamples / 2)
  const outputBuffer = Buffer.alloc(outputSamples * 2)

  for (let i = 0; i < outputSamples; i++) {
    const sample = pcmBuffer.readInt16LE(i * 4) // Every other sample
    outputBuffer.writeInt16LE(sample, i * 2)
  }

  return outputBuffer
}

/**
 * Convert Twilio audio (μ-law base64) to Gemini format (PCM 16kHz base64)
 * @param {string} twilioAudioBase64 - Base64 encoded μ-law audio from Twilio
 * @returns {string} - Base64 encoded PCM audio for Gemini
 */
export function twilioToGemini(twilioAudioBase64) {
  const mulawBuffer = Buffer.from(twilioAudioBase64, 'base64')
  const pcm8k = mulawToPCM(mulawBuffer)
  const pcm16k = resample8kTo16k(pcm8k)
  return pcm16k.toString('base64')
}

/**
 * Convert Gemini audio (PCM 16kHz base64) to Twilio format (μ-law base64)
 * @param {string} geminiAudioBase64 - Base64 encoded PCM audio from Gemini
 * @returns {string} - Base64 encoded μ-law audio for Twilio
 */
export function geminiToTwilio(geminiAudioBase64) {
  const pcm16k = Buffer.from(geminiAudioBase64, 'base64')
  const pcm8k = resample16kTo8k(pcm16k)
  const mulaw = pcmToMulaw(pcm8k)
  return mulaw.toString('base64')
}

/**
 * Split audio buffer into chunks of specified size
 * @param {Buffer} buffer - Audio buffer to chunk
 * @param {number} chunkSize - Size of each chunk in bytes
 * @returns {Buffer[]} - Array of audio chunks
 */
export function chunkAudio(buffer, chunkSize = 640) {
  const chunks = []
  for (let i = 0; i < buffer.length; i += chunkSize) {
    chunks.push(buffer.slice(i, i + chunkSize))
  }
  return chunks
}
