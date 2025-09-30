import { useQuery, useMutation } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
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
import { Phone, UserPlus, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

interface AttendeeTableProps {
  eventId: Id<'events'>
}

export function AttendeeTable({ eventId }: AttendeeTableProps) {
  const [statusFilter, setStatusFilter] = useState<
    'PENDING' | 'CONFIRMED' | 'CANCELLED' | undefined
  >(undefined)

  const { data: attendees, isLoading } = useQuery(
    convexQuery(api.attendees.listByEvent, {
      eventId,
      status: statusFilter,
    }),
  )

  const triggerCall = async (attendeeId: Id<'attendees'>) => {
    try {
      // Call the HTTP endpoint to trigger outbound call
      const response = await fetch('/api/calls/trigger-outbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attendeeId, eventId }),
      })

      if (response.ok) {
        toast.success('Call initiated successfully')
      } else {
        toast.error('Failed to initiate call')
      }
    } catch (error) {
      toast.error('Error initiating call')
      console.error(error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
    }
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}
      >
        {status}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={statusFilter === undefined ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(undefined)}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('PENDING')}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'CONFIRMED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('CONFIRMED')}
          >
            Confirmed
          </Button>
          <Button
            variant={statusFilter === 'CANCELLED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('CANCELLED')}
          >
            Cancelled
          </Button>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Attendee
        </Button>
      </div>

      {isLoading ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Loading attendees...</p>
        </div>
      ) : attendees && attendees.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ticket Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees.map((attendee) => (
                <TableRow key={attendee._id}>
                  <TableCell className="font-medium">{attendee.name}</TableCell>
                  <TableCell>{attendee.phone}</TableCell>
                  <TableCell>{attendee.email || '-'}</TableCell>
                  <TableCell>{attendee.ticketType || '-'}</TableCell>
                  <TableCell>{getStatusBadge(attendee.attendanceStatus)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerCall(attendee._id)}
                      disabled={attendee.attendanceStatus === 'CONFIRMED'}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Call
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No attendees found{statusFilter ? ` with status ${statusFilter}` : ''}
          </p>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add First Attendee
          </Button>
        </div>
      )}
    </div>
  )
}
