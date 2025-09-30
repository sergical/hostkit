'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export function CallManager() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isInitiating, setIsInitiating] = useState(false)

  const { data: calls = [] } = useQuery(
    convexQuery(api.calls.listCalls, {}),
  )

  const handleInitiateCall = async () => {
    if (!phoneNumber) return

    setIsInitiating(true)
    try {
      // TODO: Implement outbound call via Twilio API
      console.log('Initiating call to:', phoneNumber)
    } finally {
      setIsInitiating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Initiate Call */}
      <div className="flex gap-2">
        <Input
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleInitiateCall} disabled={isInitiating || !phoneNumber}>
          {isInitiating ? 'Calling...' : 'Call'}
        </Button>
      </div>

      {/* Call History */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Recent Calls</h3>
        {calls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No calls yet</p>
        ) : (
          <div className="space-y-2">
            {calls.map((call) => (
              <div
                key={call._id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{call.phoneNumber}</span>
                    <Badge variant={call.direction === 'inbound' ? 'secondary' : 'default'}>
                      {call.direction}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(call._creationTime).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{call.status}</Badge>
                  {call.duration && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
