'use client'

import * as React from 'react'
import {
  Home,
  CheckSquare,
  Settings,
  Users,
  BarChart3,
  FileText,
  Calendar,
  Zap,
} from 'lucide-react'

import { NavMain } from '@/components/nav-main'
import { NavProjects } from '@/components/nav-projects'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcher } from '@/components/team-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

// Application navigation data
const data = {
  user: {
    name: 'User',
    email: 'user@example.com',
    avatar: '/avatars/user.jpg',
  },
  teams: [
    {
      name: 'HostKit',
      logo: Zap,
      plan: 'Pro',
    },
  ],
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: Home,
      isActive: true,
      items: [
        {
          title: 'Overview',
          url: '/dashboard',
        },
        {
          title: 'Analytics',
          url: '/dashboard/analytics',
        },
        {
          title: 'Reports',
          url: '/dashboard/reports',
        },
      ],
    },
    {
      title: 'Tasks',
      url: '/tasks',
      icon: CheckSquare,
      items: [
        {
          title: 'All Tasks',
          url: '/tasks',
        },
        {
          title: 'My Tasks',
          url: '/tasks/mine',
        },
        {
          title: 'Completed',
          url: '/tasks/completed',
        },
      ],
    },
    {
      title: 'Team',
      url: '/team',
      icon: Users,
      items: [
        {
          title: 'Members',
          url: '/team/members',
        },
        {
          title: 'Roles',
          url: '/team/roles',
        },
        {
          title: 'Invitations',
          url: '/team/invitations',
        },
      ],
    },
    {
      title: 'Settings',
      url: '/settings',
      icon: Settings,
      items: [
        {
          title: 'Profile',
          url: '/settings/profile',
        },
        {
          title: 'Account',
          url: '/settings/account',
        },
        {
          title: 'Notifications',
          url: '/settings/notifications',
        },
        {
          title: 'Security',
          url: '/settings/security',
        },
      ],
    },
  ],
  projects: [
    {
      name: 'Documentation',
      url: '/projects/docs',
      icon: FileText,
    },
    {
      name: 'Analytics',
      url: '/projects/analytics',
      icon: BarChart3,
    },
    {
      name: 'Calendar',
      url: '/projects/calendar',
      icon: Calendar,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <Zap className="!size-5" />
                <span className="text-base font-semibold">HostKit</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
