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
  const context = useProjectContext() as any;
  const project = context?.project;
  
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // 8px movement to activate drag
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // Load board configuration and tasks
  useEffect(() => {
    if (!project?.id) return;
    loadBoardData();
  }, [project?.id]);

  async function loadBoardData() {
    try {
      setLoading(true);
      setError(null);

      // Load board config
      const configRes = await fetch(`/api/projects/${project.id}/board-config`);
      if (!configRes.ok) throw new Error('Failed to load board configuration');
      const configData = await configRes.json();
      setColumns(configData);

      // Load tasks
      const tasksRes = await fetch(`/api/projects/${project.id}/tasks`);
      if (!tasksRes.ok) throw new Error('Failed to load tasks');
      const tasksData = await tasksRes.json();
      setTasks(tasksData);
    } catch (err) {
      console.error('Failed to load board:', err);
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }

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
    // TODO: Open new task modal
    console.log('Add task to section:', section);
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
    <div className="flex flex-col h-full">
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
              <TaskCard task={activeTask} />
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
    </div>
  );
}