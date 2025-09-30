import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '@convex/_generated/api'
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
import { Toaster } from 'sonner'
import { useState } from 'react'
import { Users, Phone, FileText, Settings } from 'lucide-react'
import { AttendeeTable } from '@/components/AttendeeTable'
import { CallLogTable } from '@/components/CallLogTable'
import { ContentUploadForm } from '@/components/ContentUploadForm'
import { Id } from '@convex/_generated/dataModel'

export const Route = createFileRoute('/_authed/events/$eventId')({
  component: EventDetailComponent,
})

type Tab = 'attendees' | 'calls' | 'content' | 'settings'

function EventDetailComponent() {
  const { eventId } = Route.useParams()
  const [activeTab, setActiveTab] = useState<Tab>('attendees')

  const { data: event, isLoading } = useQuery(
    convexQuery(api.events.get, { eventId: eventId as Id<'events'> }),
  )

  const tabs = [
    { id: 'attendees' as Tab, label: 'Attendees', icon: Users },
    { id: 'calls' as Tab, label: 'Call Logs', icon: Phone },
    { id: 'content' as Tab, label: 'Content', icon: FileText },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ]

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
                  <BreadcrumbLink href="/events">Events</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {isLoading ? 'Loading...' : event?.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ) : event ? (
            <>
              <div>
                <h1 className="text-2xl font-bold">{event.name}</h1>
                <p className="text-muted-foreground">{event.description}</p>
              </div>

              <div className="border-b">
                <nav className="flex gap-4">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="flex-1">
                {activeTab === 'attendees' && (
                  <AttendeeTable eventId={eventId as Id<'events'>} />
                )}
                {activeTab === 'calls' && (
                  <CallLogTable eventId={eventId as Id<'events'>} />
                )}
                {activeTab === 'content' && (
                  <ContentUploadForm
                    eventId={eventId as Id<'events'>}
                    currentStatus={event.contentStatus}
                  />
                )}
                {activeTab === 'settings' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">
                            Inbound Phone Number
                          </label>
                          <p className="text-sm text-muted-foreground">
                            {event.inboundPhoneNumber || 'Not configured'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Content Status
                          </label>
                          <p className="text-sm text-muted-foreground">
                            {event.contentStatus}
                          </p>
                        </div>
                        <Button variant="outline">Edit Settings</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <div>Event not found</div>
          )}
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
