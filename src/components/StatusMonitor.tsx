import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Circle, Activity } from 'lucide-react'
import { useEffect, useRef } from 'react'

export interface StatusUpdate {
  timestamp: number
  message: string
}

interface StatusMonitorProps {
  websocketConnected: boolean
  geminiStatus: 'idle' | 'listening' | 'thinking' | 'speaking'
  micActive: boolean
  activityLog: StatusUpdate[]
}

export function StatusMonitor({
  websocketConnected,
  geminiStatus,
  micActive,
  activityLog,
}: StatusMonitorProps) {
  const activityRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest activity
  useEffect(() => {
    if (activityRef.current) {
      activityRef.current.scrollTop = activityRef.current.scrollHeight
    }
  }, [activityLog])

  const getWSStateColor = () => {
    return websocketConnected ? 'text-green-500' : 'text-gray-500'
  }

  const getWSStateText = () => {
    return websocketConnected ? 'Connected' : 'Disconnected'
  }

  const getGeminiStateColor = () => {
    switch (geminiStatus) {
      case 'listening':
        return 'text-blue-500'
      case 'thinking':
        return 'text-purple-500'
      case 'speaking':
        return 'text-green-500'
      default:
        return 'text-gray-500'
    }
  }

  const getGeminiStateText = () => {
    switch (geminiStatus) {
      case 'listening':
        return 'Listening'
      case 'thinking':
        return 'Thinking...'
      case 'speaking':
        return 'Speaking'
      default:
        return 'Idle'
    }
  }

  const getGeminiStateIcon = () => {
    const color = getGeminiStateColor()
    const baseClass = `w-3 h-3 ${color} fill-current`

    if (geminiStatus === 'listening' || geminiStatus === 'thinking') {
      return <Circle className={`${baseClass} animate-pulse`} />
    }

    return <Circle className={baseClass} />
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Connection Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection States */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">WebSocket</span>
            <div className="flex items-center gap-2">
              <Circle
                className={`w-3 h-3 ${getWSStateColor()} fill-current`}
              />
              <span className="text-sm font-medium">{getWSStateText()}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Gemini</span>
            <div className="flex items-center gap-2">
              {getGeminiStateIcon()}
              <span className="text-sm font-medium">
                {getGeminiStateText()}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Microphone</span>
            <div className="flex items-center gap-2">
              <Circle
                className={`w-3 h-3 ${
                  micActive ? 'text-green-500' : 'text-gray-500'
                } fill-current ${micActive ? 'animate-pulse' : ''}`}
              />
              <span className="text-sm font-medium">
                {micActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            Activity Log
            {activityLog.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({activityLog.length})
              </span>
            )}
          </h4>
          <div
            ref={activityRef}
            className="h-[200px] overflow-y-auto space-y-1 bg-muted/30 rounded-md p-2 text-xs font-mono"
          >
            {activityLog.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No activity yet
              </div>
            ) : (
              activityLog.slice(-20).map((activity, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground shrink-0">
                    {formatTime(activity.timestamp)}
                  </span>
                  <span className="text-gray-300">{activity.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
