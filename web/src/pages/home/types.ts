// Widget System Type Definitions
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

/**
 * Widget Types
 */
export type WidgetType =
  | 'action-items'
  | 'my-tasks'
  | 'team-activity'
  | 'project-status'
  | 'recent-updates'
  | 'performance-metrics'
  | 'notifications'
  | 'calendar'
  | 'quick-links';

/**
 * Widget Size
 */
export type WidgetSize = 'small' | 'medium' | 'large' | 'full-width';

/**
 * Widget Position
 */
export interface WidgetPosition {
  x: number; // Grid column
  y: number; // Grid row
  w: number; // Width in grid units
  h: number; // Height in grid units
}

/**
 * Widget Configuration
 */
export interface WidgetConfig {
  id: string; // Unique identifier (e.g., "my-tasks-1")
  type: WidgetType; // Widget type from WidgetType
  title: string; // Display title
  icon?: LucideIcon; // Optional icon component
  position: WidgetPosition; // Grid position and size
  visible: boolean; // Whether widget is shown
  config?: Record<string, any>; // Widget-specific configuration
  refreshInterval?: number; // Auto-refresh interval in ms (optional)
}

/**
 * Widget Component Props
 */
export interface WidgetProps {
  config: WidgetConfig;
  onUpdate?: (config: Partial<WidgetConfig>) => void;
  onRemove?: () => void;
  onRefresh?: () => void;
}

/**
 * Widget State
 */
export interface WidgetState {
  loading: boolean;
  error: string | null;
  data: any;
  lastRefresh: Date | null;
}

/**
 * Widget Component Definition
 */
export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  icon: LucideIcon;
  component: React.ComponentType<WidgetProps>;
  defaultSize: WidgetSize;
  defaultConfig?: Record<string, any>;
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  roles?: string[]; // Roles that can see this widget (undefined = all)
}

/**
 * Dashboard Layout
 */
export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  role?: string; // Associated role (undefined = default)
  isDefault?: boolean;
}

/**
 * User Dashboard Preferences
 */
export interface UserDashboardPrefs {
  userId: string;
  activeLayoutId: string;
  customLayouts: DashboardLayout[];
  hiddenWidgets?: string[]; // Widget IDs that are hidden
}

/**
 * Widget Registry Interface
 */
export interface IWidgetRegistry {
  register(definition: WidgetDefinition): void;
  get(type: WidgetType): WidgetDefinition | undefined;
  getAll(): WidgetDefinition[];
  getByRole(role: string): WidgetDefinition[];
}
