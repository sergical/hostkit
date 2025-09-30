import { useEffect, useRef } from 'react'

interface VoiceVisualizerProps {
  analyser: AnalyserNode | null
  isActive: boolean
}

export function VoiceVisualizer({ analyser, isActive }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (!analyser || !isActive || !canvasRef.current) {
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio
    canvas.height = canvas.offsetHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!isActive) return

      animationFrameRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      // Clear canvas
      ctx.fillStyle = 'rgb(17, 24, 39)' // bg-gray-900
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      const barWidth = (canvas.offsetWidth / bufferLength) * 2.5
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.offsetHeight * 0.8

        // Gradient from blue to purple
        const gradient = ctx.createLinearGradient(
          0,
          canvas.offsetHeight,
          0,
          canvas.offsetHeight - barHeight,
        )
        gradient.addColorStop(0, '#3b82f6') // blue-500
        gradient.addColorStop(1, '#8b5cf6') // purple-500

        ctx.fillStyle = gradient
        ctx.fillRect(
          x,
          canvas.offsetHeight - barHeight,
          barWidth - 1,
          barHeight,
        )

        x += barWidth
      }
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [analyser, isActive])

  return (
    <div className="w-full h-32 bg-gray-900 rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
