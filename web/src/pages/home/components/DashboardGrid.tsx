import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { DashboardLayout, WidgetConfig } from '../types';
import { useIsMobile, useIsTablet } from '@/hooks/useResponsive';
import { Layout, Grid3x3, Maximize2 } from 'lucide-react';

export interface DashboardGridProps {
  layout: DashboardLayout;
  onLayoutChange?: (layout: DashboardLayout) => void;
  children: React.ReactNode;
  editable?: boolean;
}

/**
 * Dashboard Grid Component
 * 
 * Responsive grid layout system for widgets:
 * - Desktop: 4 columns
 * - Tablet: 2 columns  
 * - Mobile: 1 column
 * 
 * Features:
 * - Drag-and-drop reordering
 * - Auto-save layout
 * - Responsive breakpoints
 * - Grid gap and padding
 */
export const DashboardGrid: React.FC<DashboardGridProps> = ({
  layout,
  onLayoutChange,
  children,
  editable = false
}) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);

  // Determine columns based on screen size
  const columns = isMobile ? 1 : isTablet ? 2 : 4;

  // Initialize widget order from layout
  useEffect(() => {
    const sortedWidgets = [...layout.widgets]
      .filter(w => w.visible)
      .sort((a, b) => {
        const aPos = a.position.y * 100 + a.position.x;
        const bPos = b.position.y * 100 + b.position.x;
        return aPos - bPos;
      });
    setWidgetOrder(sortedWidgets.map(w => w.id));
  }, [layout]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement to activate drag
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = widgetOrder.indexOf(active.id as string);
    const newIndex = widgetOrder.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder widgets
    const newOrder = [...widgetOrder];
    newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, active.id as string);
    setWidgetOrder(newOrder);

    // Update layout positions
    if (onLayoutChange) {
      const updatedWidgets = newOrder.map((id, index) => {
        const widget = layout.widgets.find(w => w.id === id);
        if (!widget) return null;

        // Calculate new grid position
        const row = Math.floor(index / columns);
        const col = index % columns;

        return {
          ...widget,
          position: {
            ...widget.position,
            x: col,
            y: row
          }
        };
      }).filter((w): w is WidgetConfig => w !== null);

      onLayoutChange({
        ...layout,
        widgets: updatedWidgets
      });
    }
  };

  const activeWidget = activeId ? layout.widgets.find(w => w.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
        <div
          className={`
            grid gap-4
            ${isMobile ? 'grid-cols-1' : isTablet ? 'grid-cols-2' : 'grid-cols-4'}
            auto-rows-[200px]
          `}
          style={{
            gridAutoFlow: 'dense' // Allow items to fill gaps
          }}
        >
          {children}
        </div>
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeWidget && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl opacity-80 p-4 border-2 border-indigo-500">
            <div className="flex items-center gap-2">
              {activeWidget.icon && <activeWidget.icon className="w-4 h-4" />}
              <span className="font-semibold text-sm">{activeWidget.title}</span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

/**
 * Sortable Widget Item
 * Wraps widgets to make them draggable
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
  size: 'small' | 'medium' | 'large' | 'full-width';
  disabled?: boolean;
}

export const SortableWidget: React.FC<SortableWidgetProps> = ({
  id,
  children,
  size,
  disabled = false
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Map size to grid span
  const sizeClasses = {
    'small': 'col-span-1 row-span-1',
    'medium': 'col-span-2 row-span-1',
    'large': 'col-span-2 row-span-2',
    'full-width': 'col-span-full row-span-1'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${sizeClasses[size]} ${isDragging ? 'z-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
};

/**
 * Layout Preset Switcher
 */
export interface LayoutPresetSwitcherProps {
  currentLayout: DashboardLayout;
  availableLayouts: DashboardLayout[];
  onLayoutChange: (layout: DashboardLayout) => void;
}

export const LayoutPresetSwitcher: React.FC<LayoutPresetSwitcherProps> = ({
  currentLayout,
  availableLayouts,
  onLayoutChange
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <Layout className="w-4 h-4" />
        <span className="text-sm font-medium">{currentLayout.name}</span>
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Layout Presets
              </p>
            </div>

            {availableLayouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => {
                  onLayoutChange(layout);
                  setShowMenu(false);
                }}
                className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  layout.id === currentLayout.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {layout.id === currentLayout.id ? (
                    <div className="mt-1 w-4 h-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  ) : (
                    <Grid3x3 className="w-4 h-4 mt-1 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {layout.name}
                    </p>
                    {layout.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {layout.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                      {layout.widgets.length} widgets
                    </p>
                  </div>
                </div>
              </button>
            ))}

            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2 px-3">
              <button
                onClick={() => {
                  // TODO: Open customize modal
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center gap-2"
              >
                <Maximize2 className="w-4 h-4" />
                Customize Layout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Hook to manage dashboard layout with localStorage persistence
 */
export function useDashboardLayout(userId: string, defaultLayout: DashboardLayout) {
  const [layout, setLayout] = useState<DashboardLayout>(defaultLayout);

  // Load layout from localStorage
  useEffect(() => {
    const storageKey = `dashboard-layout-${userId}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLayout(parsed);
      } catch (error) {
        console.error('Failed to parse saved layout:', error);
      }
    }
  }, [userId]);

  // Save layout to localStorage
  const updateLayout = useCallback((newLayout: DashboardLayout) => {
    setLayout(newLayout);
    const storageKey = `dashboard-layout-${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(newLayout));
  }, [userId]);

  // Reset to default
  const resetLayout = useCallback(() => {
    updateLayout(defaultLayout);
  }, [defaultLayout, updateLayout]);

  return {
    layout,
    updateLayout,
    resetLayout
  };
}
