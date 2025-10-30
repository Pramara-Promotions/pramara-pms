// Default Dashboard Layouts
import {
  AlertCircle,
  CheckCircle,
  Users,
  TrendingUp,
  Bell,
  Calendar,
  Link as LinkIcon,
  Activity,
  BarChart3
} from 'lucide-react';
import { DashboardLayout, WidgetConfig } from './types';

/**
 * Default layout for Admin/Super Admin role
 */
export const adminDefaultLayout: DashboardLayout = {
  id: 'admin-default',
  name: 'Admin Dashboard',
  description: 'Overview of all projects, teams, and system metrics',
  role: 'Admin',
  isDefault: true,
  widgets: [
    {
      id: 'action-items-1',
      type: 'action-items',
      title: 'Action Items',
      icon: AlertCircle,
      position: { x: 0, y: 0, w: 2, h: 2 },
      visible: true,
      config: {
        showCriticalOnly: false,
        maxItems: 10
      }
    },
    {
      id: 'project-status-1',
      type: 'project-status',
      title: 'Project Status',
      icon: TrendingUp,
      position: { x: 2, y: 0, w: 2, h: 2 },
      visible: true,
      config: {
        showHealthIndicators: true,
        maxProjects: 6
      }
    },
    {
      id: 'team-activity-1',
      type: 'team-activity',
      title: 'Team Activity',
      icon: Users,
      position: { x: 0, y: 2, w: 2, h: 2 },
      visible: true,
      config: {
        maxActivities: 8
      }
    },
    {
      id: 'performance-metrics-1',
      type: 'performance-metrics',
      title: 'Performance Metrics',
      icon: BarChart3,
      position: { x: 2, y: 2, w: 2, h: 2 },
      visible: true,
      config: {
        showCharts: true,
        period: 'week'
      }
    },
    {
      id: 'notifications-1',
      type: 'notifications',
      title: 'Notifications',
      icon: Bell,
      position: { x: 0, y: 4, w: 1, h: 1 },
      visible: true,
      config: {
        maxNotifications: 5
      }
    },
    {
      id: 'quick-links-1',
      type: 'quick-links',
      title: 'Quick Links',
      icon: LinkIcon,
      position: { x: 1, y: 4, w: 1, h: 1 },
      visible: true,
      config: {
        links: [
          { label: 'Manage Users', url: '/admin', icon: 'Users' },
          { label: 'System Settings', url: '/settings', icon: 'Settings' },
          { label: 'Reports', url: '/reports', icon: 'FileText' }
        ]
      }
    }
  ]
};

/**
 * Default layout for Manager role
 */
export const managerDefaultLayout: DashboardLayout = {
  id: 'manager-default',
  name: 'Manager Dashboard',
  description: 'Focus on your projects and team performance',
  role: 'Manager',
  isDefault: true,
  widgets: [
    {
      id: 'my-tasks-1',
      type: 'my-tasks',
      title: 'My Tasks',
      icon: CheckCircle,
      position: { x: 0, y: 0, w: 2, h: 2 },
      visible: true,
      config: {
        showOverdueFirst: true,
        maxTasks: 8
      }
    },
    {
      id: 'project-status-1',
      type: 'project-status',
      title: 'My Projects',
      icon: TrendingUp,
      position: { x: 2, y: 0, w: 2, h: 2 },
      visible: true,
      config: {
        showHealthIndicators: true,
        assignedOnly: true,
        maxProjects: 6
      }
    },
    {
      id: 'team-activity-1',
      type: 'team-activity',
      title: 'Team Activity',
      icon: Activity,
      position: { x: 0, y: 2, w: 2, h: 2 },
      visible: true,
      config: {
        teamOnly: true,
        maxActivities: 6
      }
    },
    {
      id: 'calendar-1',
      type: 'calendar',
      title: 'Calendar',
      icon: Calendar,
      position: { x: 2, y: 2, w: 2, h: 2 },
      visible: true,
      config: {
        showTasks: true,
        showMeetings: true
      }
    },
    {
      id: 'notifications-1',
      type: 'notifications',
      title: 'Notifications',
      icon: Bell,
      position: { x: 0, y: 4, w: 2, h: 1 },
      visible: true,
      config: {
        maxNotifications: 5
      }
    },
    {
      id: 'quick-links-1',
      type: 'quick-links',
      title: 'Quick Links',
      icon: LinkIcon,
      position: { x: 2, y: 4, w: 2, h: 1 },
      visible: true,
      config: {
        links: [
          { label: 'My Projects', url: '/projects?view=assigned', icon: 'Folder' },
          { label: 'Team Reports', url: '/reports/team', icon: 'BarChart' },
          { label: 'Task Board', url: '/tasks', icon: 'CheckSquare' }
        ]
      }
    }
  ]
};

/**
 * Default layout for Worker role
 */
export const workerDefaultLayout: DashboardLayout = {
  id: 'worker-default',
  name: 'Worker Dashboard',
  description: 'Focus on your assigned tasks and quick actions',
  role: 'Worker',
  isDefault: true,
  widgets: [
    {
      id: 'my-tasks-1',
      type: 'my-tasks',
      title: 'My Tasks',
      icon: CheckCircle,
      position: { x: 0, y: 0, w: 3, h: 2 },
      visible: true,
      config: {
        showOverdueFirst: true,
        showDueToday: true,
        maxTasks: 10
      }
    },
    {
      id: 'calendar-1',
      type: 'calendar',
      title: 'My Schedule',
      icon: Calendar,
      position: { x: 3, y: 0, w: 1, h: 2 },
      visible: true,
      config: {
        showTasks: true,
        compact: true
      }
    },
    {
      id: 'recent-updates-1',
      type: 'recent-updates',
      title: 'Recent Updates',
      icon: Bell,
      position: { x: 0, y: 2, w: 2, h: 2 },
      visible: true,
      config: {
        maxUpdates: 5
      }
    },
    {
      id: 'quick-links-1',
      type: 'quick-links',
      title: 'Quick Actions',
      icon: LinkIcon,
      position: { x: 2, y: 2, w: 2, h: 2 },
      visible: true,
      config: {
        links: [
          { label: 'Scan QR Code', url: '/batches?action=scan', icon: 'QrCode' },
          { label: 'Log Movement', url: '/batches?action=move', icon: 'Move' },
          { label: 'Report Issue', url: '/issues/new', icon: 'AlertCircle' },
          { label: 'View Tasks', url: '/tasks/my', icon: 'CheckSquare' }
        ]
      }
    }
  ]
};

/**
 * Get default layout by role
 */
export function getDefaultLayoutByRole(role: string): DashboardLayout {
  const roleNormalized = role.toLowerCase();
  
  if (roleNormalized.includes('admin')) {
    return adminDefaultLayout;
  }
  
  if (roleNormalized.includes('manager')) {
    return managerDefaultLayout;
  }
  
  // Default to worker layout
  return workerDefaultLayout;
}

/**
 * All available default layouts
 */
export const defaultLayouts: DashboardLayout[] = [
  adminDefaultLayout,
  managerDefaultLayout,
  workerDefaultLayout
];
