import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { PhoneIncoming, PhoneOutgoing, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CallLogTableProps {
  eventId: Id<'events'>
}

export function CallLogTable({ eventId }: CallLogTableProps) {
  const [directionFilter, setDirectionFilter] = useState<
    'INBOUND' | 'OUTBOUND' | undefined
  >(undefined)
  const [expandedCallId, setExpandedCallId] = useState<Id<'calls'> | null>(null)

  const { data: calls, isLoading } = useQuery(
    convexQuery(api.calls.listByEvent, {
      eventId,
      direction: directionFilter,
    }),
  )

  const getStatusBadge = (status: string) => {
    const styles = {
      initiated: 'bg-blue-100 text-blue-800',
      ringing: 'bg-purple-100 text-purple-800',
      'in-progress': 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      busy: 'bg-orange-100 text-orange-800',
      'no-answer': 'bg-gray-100 text-gray-800',
    }
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}
      >
        {status}
      </span>
    )
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={directionFilter === undefined ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDirectionFilter(undefined)}
        >
          All Calls
        </Button>
        <Button
          variant={directionFilter === 'INBOUND' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDirectionFilter('INBOUND')}
        >
          <PhoneIncoming className="mr-2 h-4 w-4" />
          Inbound
        </Button>
        <Button
          variant={directionFilter === 'OUTBOUND' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDirectionFilter('OUTBOUND')}
        >
          <PhoneOutgoing className="mr-2 h-4 w-4" />
          Outbound
        </Button>
      </div>

      {isLoading ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Loading calls...</p>
        </div>
      ) : calls && calls.length > 0 ? (
        <div className="space-y-2">
          {calls.map((call) => (
            <Card key={call._id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {call.direction === 'INBOUND' ? (
                      <PhoneIncoming className="h-4 w-4 text-blue-500" />
                    ) : (
                      <PhoneOutgoing className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <CardTitle className="text-base">
                        {call.direction} Call
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {new Date(call.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(call.status)}
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(call.durationSeconds)}
                    </span>
                    {(call.transcript || call.aiSummary) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedCallId(
                            expandedCallId === call._id ? null : call._id,
                          )
                        }
                      >
                        {expandedCallId === call._id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {expandedCallId === call._id && (
                <CardContent className="pt-0 space-y-4">
                  {call.aiSummary && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">AI Summary</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                        {call.aiSummary}
                      </p>
                    </div>
                  )}
                  {call.transcript && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Transcript</h4>
                      <div className="text-sm text-muted-foreground bg-muted p-3 rounded max-h-60 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-sans">
                          {call.transcript}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No calls found
            {directionFilter ? ` for ${directionFilter.toLowerCase()} direction` : ''}
          </p>
        </div>
      )}
    </div>
  )
}
