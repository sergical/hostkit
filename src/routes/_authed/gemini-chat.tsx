import { createFileRoute } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Toaster, toast } from 'sonner'
import { useState, useRef, useEffect } from 'react'
import { Phone, PhoneOff, Circle } from 'lucide-react'
import { VoiceVisualizer } from '@/components/VoiceVisualizer'
import {
  TranscriptionPanel,
  TranscriptMessage,
} from '@/components/TranscriptionPanel'
import { StatusMonitor, StatusUpdate } from '@/components/StatusMonitor'
import { AudioProcessor } from '@/lib/audio-processor'
import { GoogleGenAI, Modality } from '@google/genai'
import { useConvexAction } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/_authed/gemini-chat')({
  component: GeminiChatComponent,
})

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
type GeminiStatus = 'idle' | 'listening' | 'thinking' | 'speaking'

function GeminiChatComponent() {
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful AI assistant. Have a natural, friendly conversation with the user.',
  )
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([])
  const [geminiStatus, setGeminiStatus] = useState<GeminiStatus>('idle')
  const [micActive, setMicActive] = useState(false)

  const geminiSessionRef = useRef<any | null>(null)
  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const generateToken = useConvexAction(api.gemini.generateEphemeralToken)

  const handleConnect = async () => {
    try {
      setStatus('connecting')
      toast.info('Initializing audio...')

      // Initialize audio processor
      const audioProcessor = new AudioProcessor()
      await audioProcessor.initialize()
      audioProcessorRef.current = audioProcessor

      // Get analyser for visualization
      const analyserNode = audioProcessor.getAnalyser()
      setAnalyser(analyserNode)

      // Get ephemeral token from Convex
      toast.info('Getting secure token...')
      const tokenData = await generateToken({})

      // Initialize Gemini with ephemeral token
      toast.info('Connecting to Gemini...')
      const ai = new GoogleGenAI({ token: tokenData.token })

      // Track state for callbacks
      const stateRef = {
        current: 'idle' as GeminiStatus,
        micActive: false,
      }

      const addStatusUpdate = (message: string) => {
        setStatusUpdates((prev) => [...prev, { timestamp: Date.now(), message }])
      }

      // Connect to Gemini Live API
      const session = await ai.live.connect({
        model: 'models/gemini-2.0-flash-exp',
        config: {
          responseModalities: [Modality.AUDIO, Modality.TEXT],
          systemInstruction: systemPrompt,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck',
              },
            },
          },
        },
        callbacks: {
          onopen: () => {
            console.log('[Gemini] Connected')
            setStatus('connected')
            setGeminiStatus('listening')
            stateRef.current = 'listening'
            toast.success('Connected to Gemini!')
            addStatusUpdate('Connected to Gemini Live API')

            // Start sending audio
            audioProcessor.onAudioData((audioData) => {
              if (!stateRef.micActive) {
                stateRef.micActive = true
                setMicActive(true)
                addStatusUpdate('Microphone active')
              }

              try {
                session.sendRealtimeInput({
                  audio: { data: audioData, mimeType: 'audio/pcm;rate=16000' },
                })
              } catch (error) {
                console.error('[Gemini] Audio send error:', error)
              }
            })
          },
          onmessage: async (message: any) => {
            console.log('[Gemini] Message:', message)

            // Text response
            if (message.text) {
              setMessages((prev) => [...prev, {
                role: 'assistant',
                text: message.text,
                timestamp: Date.now(),
              }])
            }

            // Audio response
            if (message.data) {
              if (stateRef.current !== 'speaking') {
                stateRef.current = 'speaking'
                setGeminiStatus('speaking')
                addStatusUpdate('Gemini is speaking')
              }

              if (audioProcessorRef.current) {
                await audioProcessorRef.current.playAudio(message.data)
              }
            }

            // Server content
            if (message.serverContent) {
              const content = message.serverContent

              if (content.turnComplete) {
                stateRef.current = 'listening'
                setGeminiStatus('listening')
                addStatusUpdate('Turn complete, listening')
              }

              if (content.interrupted) {
                stateRef.current = 'listening'
                setGeminiStatus('listening')
                addStatusUpdate('Response interrupted')
              }

              if (content.modelTurn?.parts) {
                if (stateRef.current === 'listening') {
                  stateRef.current = 'thinking'
                  setGeminiStatus('thinking')
                  addStatusUpdate('Gemini is thinking')
                }

                for (const part of content.modelTurn.parts) {
                  if (part.text) {
                    setMessages((prev) => [...prev, {
                      role: 'assistant',
                      text: part.text,
                      timestamp: Date.now(),
                    }])
                  }
                }
              }
            }

            // User transcription
            if (message.inputTranscription?.text) {
              if (stateRef.current === 'listening') {
                addStatusUpdate('Detected user speech')
              }

              setMessages((prev) => [...prev, {
                role: 'user',
                text: message.inputTranscription.text,
                timestamp: Date.now(),
              }])
            }
          },
          onerror: (error: any) => {
            console.error('[Gemini] Error:', error)
            toast.error('Gemini error: ' + error.message)
            setStatus('error')
          },
          onclose: (event: any) => {
            console.log('[Gemini] Closed:', event.reason || 'No reason')
            setStatus('disconnected')
            toast.info('Disconnected from Gemini')
            handleDisconnect()
          },
        },
      })

      geminiSessionRef.current = session
    } catch (error) {
      console.error('[Connect] Error:', error)
      toast.error('Failed to connect: ' + (error as Error).message)
      setStatus('error')
      handleDisconnect()
    }
  }

  const handleDisconnect = () => {
    // Close Gemini session
    if (geminiSessionRef.current) {
      try {
        geminiSessionRef.current.close()
      } catch (error) {
        console.error('[Gemini] Error closing:', error)
      }
      geminiSessionRef.current = null
    }

    // Stop audio processor
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop()
      audioProcessorRef.current = null
    }

    setAnalyser(null)
    setStatus('disconnected')
    setMicActive(false)
    setGeminiStatus('idle')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleDisconnect()
    }
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-500'
      case 'connecting':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Error'
      default:
        return 'Disconnected'
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Talk to Gemini</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div>
            <h1 className="text-2xl font-bold">Talk to Gemini</h1>
            <p className="text-muted-foreground">
              Have a voice conversation with Gemini Live API
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={4}
                    disabled={status !== 'disconnected'}
                    placeholder="Enter system instructions for Gemini..."
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Set before connecting. Cannot be changed during session.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Circle
                      className={`w-3 h-3 ${getStatusColor()} fill-current`}
                    />
                    <span className="text-sm font-medium">
                      {getStatusText()}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {status === 'disconnected' || status === 'error' ? (
                      <Button onClick={handleConnect} className="flex-1">
                        <Phone className="mr-2 h-4 w-4" />
                        Start Call
                      </Button>
                    ) : (
                      <Button
                        onClick={handleDisconnect}
                        variant="destructive"
                        className="flex-1"
                        disabled={status === 'connecting'}
                      >
                        <PhoneOff className="mr-2 h-4 w-4" />
                        Hang Up
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Voice Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  <VoiceVisualizer
                    analyser={analyser}
                    isActive={status === 'connected'}
                  />
                </CardContent>
              </Card>

              <StatusMonitor
                websocketConnected={status === 'connected'}
                geminiStatus={geminiStatus}
                micActive={micActive}
                activityLog={statusUpdates}
              />
            </div>

            <TranscriptionPanel messages={messages} />
          </div>
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
