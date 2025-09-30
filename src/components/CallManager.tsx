'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useAction, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Phone, Plus, RotateCcw } from 'lucide-react'

export function CallManager() {
  const { data: events = [] } = useQuery(convexQuery(api.events.listEvents, {}))
  const initiateCall = useAction(api.twilio.initiateCall)
  const [callingPhone, setCallingPhone] = useState<string | null>(null)

  const handleCallAttendee = async (phoneNumber: string, eventId: string) => {
    setCallingPhone(phoneNumber)
    try {
      const result = await initiateCall({
        to: phoneNumber,
        eventId: eventId as any,
      })

      if (result.success) {
        toast.success(`Calling ${phoneNumber}...`)
      } else {
        toast.error(result.error || 'Failed to initiate call')
      }
    } catch (error) {
      toast.error('Failed to initiate call')
      console.error(error)
    } finally {
      setCallingPhone(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Event Attendance Confirmation</h2>
        <p className="text-muted-foreground">Call attendees to confirm their event attendance</p>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No events found</p>
      ) : (
        <div className="space-y-8">
          {events.map((event) => (
            <EventSection
              key={event._id}
              event={event}
              onCall={handleCallAttendee}
              callingPhone={callingPhone}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EventSection({
  event,
  onCall,
  callingPhone,
}: {
  event: any
  onCall: (phoneNumber: string, eventId: string) => void
  callingPhone: string | null
}) {
  const { data: eventDetails } = useQuery({
    ...convexQuery(api.events.getEventWithAttendees, { eventId: event._id }),
    enabled: !!event._id,
  })
  const addAttendee = useMutation(api.events.addAttendee)
  const resetToPending = useMutation(api.events.resetAttendeeToPending)
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddAttendee = async () => {
    if (!name || !phoneNumber) {
      toast.error('Please enter name and phone number')
      return
    }

    setIsAdding(true)
    try {
      await addAttendee({
        eventId: event._id,
        name,
        phoneNumber,
      })
      toast.success('Attendee added')
      setName('')
      setPhoneNumber('')
    } catch (error) {
      toast.error('Failed to add attendee')
      console.error(error)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-4">
        <h3 className="text-lg font-semibold">{event.name}</h3>
        <p className="text-sm text-muted-foreground">{event.description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(event.date).toLocaleDateString()} • {event.location}
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <h4 className="text-sm font-medium">Add Attendee</h4>
        <div className="flex gap-2">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <Button onClick={handleAddAttendee} disabled={isAdding}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {eventDetails && eventDetails.attendees.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Attendees</h4>
          <div className="space-y-2">
            {eventDetails.attendees.map((attendee) => (
              <div
                key={attendee._id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{attendee.name}</span>
                    <Badge
                      variant={
                        attendee.status === 'confirmed'
                          ? 'default'
                          : attendee.status === 'cancelled'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {attendee.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{attendee.phoneNumber}</p>
                </div>
                <div className="flex gap-2">
                  {attendee.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => onCall(attendee.phoneNumber, event._id)}
                      disabled={callingPhone === attendee.phoneNumber}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {callingPhone === attendee.phoneNumber ? 'Calling...' : 'Call'}
                    </Button>
                  )}
                  {attendee.status !== 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resetToPending({ attendeeId: attendee._id })}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
