import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from '../../../components/tasks/KanbanColumn';
import TaskCard from '../../../components/tasks/TaskCard';
import TaskDetailPanel from '../../../components/tasks/TaskDetailPanel';
import CreateTaskModal from '../../../components/tasks/CreateTaskModal';
import { Loader2, AlertCircle, Plus, Settings } from 'lucide-react';
import { useProjectContext } from '../ProjectContext';

interface Task {
  id: string;
  name: string;
  section: 'Pre_Prod' | 'Production' | 'QC' | 'Dispatch';
  status: 'green' | 'amber' | 'red';
  priority: 'Low' | 'Med' | 'High';
  assignee?: string;
  dueDate?: string;
  tags?: string[];
  attachments?: number;
  position: number;
}

interface BoardColumn {
  id: string;
  name: string;
  section: string;
  position: number;
  wipLimit?: number;
  color?: string;
  taskCount: number;
}

export default function BoardTab() {
  const project = useProjectContext();

  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [defaultSection, setDefaultSection] = useState<string>('Pre_Prod');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Load board configuration and tasks
  const loadBoardData = React.useCallback(async () => {
    if (!project?.id) {
      setError('Project ID not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load board config
      const configRes = await fetch(`/api/projects/${project.id}/board-config`);
      if (configRes.status === 404) {
        // Fallback to default columns if backend not implemented
        setColumns([
          { id: 'col-pre', name: 'Pre Production', section: 'Pre_Prod', position: 0, taskCount: 0, wipLimit: 10, color: '#0ea5e9' },
          { id: 'col-prod', name: 'Production', section: 'Production', position: 1, taskCount: 0, wipLimit: 15, color: '#10b981' },
          { id: 'col-qc', name: 'Quality Check', section: 'QC', position: 2, taskCount: 0, wipLimit: 10, color: '#f59e0b' },
          { id: 'col-disp', name: 'Dispatch', section: 'Dispatch', position: 3, taskCount: 0, wipLimit: 10, color: '#8b5cf6' }
        ]);
      } else if (!configRes.ok) {
        throw new Error('Failed to load board configuration');
      } else {
        const configData = await configRes.json();
        setColumns(configData);
      }

      // Load tasks
      const tasksRes = await fetch(`/api/projects/${project.id}/tasks`);
      if (tasksRes.status === 404) {
        setTasks([]);
      } else if (!tasksRes.ok) {
        throw new Error('Failed to load tasks');
      } else {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }
    } catch (err) {
      console.error('Failed to load board:', err);
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  // Group tasks by section
  function getTasksBySection(section: string): Task[] {
    return tasks
      .filter(t => t.section === section)
      .sort((a, b) => a.position - b.position);
  }

  // Drag handlers
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    setActiveTask(task || null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;

    // Check if dragging over a column (section)
    const overColumn = columns.find(c => c.section === overId);
    if (overColumn && activeTask.section !== overColumn.section) {
      // Optimistically update local state
      setTasks(prev => prev.map(t =>
        t.id === activeTask.id
          ? { ...t, section: overColumn.section as Task['section'], position: 0 }
          : t
      ));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    const overId = over.id as string;

    // Determine target section
    let targetSection = activeTask.section;
    let targetPosition = activeTask.position;

    // Check if dropped on a column
    const overColumn = columns.find(c => c.section === overId);
    if (overColumn) {
      targetSection = overColumn.section as Task['section'];
      // Find position (end of column)
      const tasksInColumn = tasks.filter(t => t.section === targetSection);
      targetPosition = tasksInColumn.length;
    } else {
      // Dropped on another task
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        targetSection = overTask.section as Task['section'];
        targetPosition = overTask.position;
      }
    }

    // Only update if section or position changed
    if (targetSection !== activeTask.section || targetPosition !== activeTask.position) {
      try {
        // Optimistically update local state to reduce flicker
        setTasks(prev => {
          const updated = [...prev];
          // Work within target section ordering
          const fromSection = activeTask.section;
          const toSection = targetSection;

          // Remove active from its current list
          const withoutActive = updated.filter(t => t.id !== activeTask.id);

          // Build new list for target section
          const targetList = withoutActive
            .filter(t => t.section === toSection)
            .sort((a, b) => a.position - b.position);

          // Insert active at computed index
          const insertIndex = Math.max(0, Math.min(targetPosition, targetList.length));
          const movedTask: Task = { ...activeTask, section: toSection, position: insertIndex } as Task;
          targetList.splice(insertIndex, 0, movedTask);

          // Reassign positions in target list
          targetList.forEach((t, idx) => (t.position = idx));

          // Reassign positions in from section (if different)
          if (fromSection !== toSection) {
            const fromList = withoutActive
              .filter(t => t.section === fromSection)
              .sort((a, b) => a.position - b.position);
            fromList.forEach((t, idx) => (t.position = idx));
          }

          // Merge back into full list
          const byId: Record<string, Task> = {};
          withoutActive.forEach(t => (byId[t.id] = t));
          targetList.forEach(t => (byId[t.id] = t));
          return Object.values(byId);
        });

        // Call API to move task
        const res = await fetch(`/api/tasks/${activeTask.id}/move`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: targetSection,
            position: targetPosition
          })
        });

        if (!res.ok) {
          throw new Error('Failed to move task');
        }

        // Reload tasks to get updated positions
        await loadBoardData();
      } catch (err) {
        console.error('Failed to move task:', err);
        setError('Failed to move task. Refreshing...');
        // Reload to restore correct state
        await loadBoardData();
      }
    }
  }

  function handleTaskClick(task: Task) {
    setSelectedTaskId(task.id);
    setIsPanelOpen(true);
  }

  function handleClosePanel() {
    setIsPanelOpen(false);
    setSelectedTaskId(null);
  }

  function handleTaskUpdate() {
    loadBoardData();
  }

  function handleAddTask(section: string) {
    setDefaultSection(section);
    setIsCreateModalOpen(true);
  }

  async function handleCreateTask(taskData: {
    name: string;
    section: string;
    priority?: string;
    assignee?: string;
    dueDate?: string;
  }) {
    try {
      const response = await fetch(`/api/projects/${project.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          status: 'green', // Default status
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      setIsCreateModalOpen(false);
      loadBoardData(); // Reload the board data
    } catch (err) {
      console.error('Error creating task:', err);
      // You could add error toast notification here
    }
  }

  function handleColumnMenu(column: BoardColumn) {
    // TODO: Open column settings
    console.log('Column menu:', column);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button
          onClick={loadBoardData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Project Board
          </h2>
          <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1">
            Drag and drop tasks to update their status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddTask('Pre_Prod')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
          <button
            onClick={() => console.log('Board settings')}
            className="p-2 rounded-lg border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            title="Board settings"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns
            .sort((a, b) => a.position - b.position)
            .map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={getTasksBySection(column.section)}
                projectId={project?.id}
                onTaskClick={handleTaskClick}
                onAddTask={() => handleAddTask(column.section)}
                onColumnMenu={() => handleColumnMenu(column)}
              />
            ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-3 scale-105">
              <TaskCard task={activeTask} projectId={project?.id} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty State */}
      {tasks.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950 flex items-center justify-center">
            <Plus className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No tasks yet
          </h3>
          <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
            Create your first task to get started
          </p>
          <button
            onClick={() => handleAddTask('Pre_Prod')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </button>
        </div>
      )}

      {/* Task Detail Panel */}
      {selectedTaskId && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          isOpen={isPanelOpen}
          onClose={handleClosePanel}
          onUpdate={handleTaskUpdate}
        />
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        defaultSection={defaultSection}
      />
    </div>
  );
}