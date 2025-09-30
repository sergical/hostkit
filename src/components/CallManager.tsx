'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useAction } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export function CallManager() {
  const [phoneNumber, setPhoneNumber] = useState('6479844940')

  const { data: calls = [] } = useQuery(
    convexQuery(api.calls.listCalls, {}),
  )

  const initiateCall = useAction(api.twilio.initiateCall)
  const [isPending, setIsPending] = useState(false)

  const handleInitiateCall = async () => {
    if (!phoneNumber) return

    setIsPending(true)
    try {
      const result = await initiateCall({
        to: phoneNumber,
      })

      if (result.success) {
        toast.success(`Calling ${phoneNumber}...`)
        setPhoneNumber('')
      } else {
        toast.error(result.error || 'Failed to initiate call')
      }
    } catch (error) {
      toast.error('Failed to initiate call')
      console.error(error)
    } finally {
      setIsPending(false)
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
        <Button onClick={handleInitiateCall} disabled={isPending || !phoneNumber}>
          {isPending ? 'Calling...' : 'Call'}
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
