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
import { TodoList } from '@/components/TodoListServer'
import { Toaster } from 'sonner'
import { QrCodeDisplay } from '@/components/QrCode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardComponent,
})

function DashboardComponent() {
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
                  <BreadcrumbPage>Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center">
              <span className="text-muted-foreground">Analytics</span>
            </div>
            <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center">
              <span className="text-muted-foreground">Reports</span>
            </div>
            <Card className="bg-muted/50 border-0">
              <CardHeader>
                <CardTitle className="text-base">Share Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2">
                <QrCodeDisplay to="/dashboard" size={120} className="p-2" />
                <p className="text-center text-xs text-muted-foreground">
                  Scan to access
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="bg-muted/50 min-h-[400px] flex-1 rounded-xl p-4">
            <h2 className="text-lg font-semibold mb-4">Todo List</h2>
            <TodoList />
          </div>
        </div>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
