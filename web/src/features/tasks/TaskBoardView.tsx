import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { arrayMove } from "@dnd-kit/sortable";
import BoardColumn from "./components/BoardColumn";
import ColumnCustomizationModal from "./components/ColumnCustomizationModal";
import { Section, Task, useTasks } from "./state/tasks.store";

function SortableColumn({
  column,
  tasks,
  onSettings,
}: {
  column: { id: Section; title: string; color?: string; wipLimit?: number };
  tasks: Task[];
  onSettings: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BoardColumn
        id={column.id}
        title={column.title}
        tasks={tasks}
        color={column.color}
        wipLimit={column.wipLimit}
        onSettings={onSettings}
      />
    </div>
  );
}

export default function TaskBoardView() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { tasks, columns, moveTaskToSection, reorderWithinSection, reorderColumns, filters } = useTasks();
  const [editingColumn, setEditingColumn] = useState<Section | null>(null);

  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.order - b.order);
  }, [columns]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filters.section && filters.section !== "All" && t.section !== filters.section) return false;
      if (filters.assignee && filters.assignee !== "All" && (t.assignee ?? "") !== filters.assignee)
        return false;
      if (filters.status && filters.status !== "All" && t.status !== filters.status) return false;
      if (filters.tag && filters.tag !== "All" && !(t.tags ?? []).includes(filters.tag)) return false;
      if (filters.q && !t.name.toLowerCase().includes(filters.q.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filters]);

  const tasksByCol = useMemo(
    () =>
      sortedColumns.reduce<Record<string, Task[]>>((acc, c) => {
        acc[c.id] = filtered.filter((t) => t.section === c.id);
        return acc;
      }, {}),
    [filtered, sortedColumns]
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    // Check if dragging a column
    const isColumnDrag = sortedColumns.some((c) => c.id === activeId);
    if (isColumnDrag) {
      const oldIndex = sortedColumns.findIndex((c) => c.id === activeId);
      const newIndex = sortedColumns.findIndex((c) => c.id === overId);
      if (oldIndex !== newIndex) {
        const reordered = arrayMove(sortedColumns, oldIndex, newIndex);
        reorderColumns(reordered.map((c) => c.id));
      }
      return;
    }

    // Task drag logic
    const overIsColumn = sortedColumns.some((c) => c.id === overId);
    if (overIsColumn) {
      moveTaskToSection(activeId, overId as Section);
      return;
    }

    const all = filtered;
    const activeTask = all.find((t) => t.id === activeId);
    const overTask = all.find((t) => t.id === overId);
    if (!activeTask || !overTask) return;

    if (activeTask.section === overTask.section) {
      const col = activeTask.section;
      const ids = (tasksByCol[col] ?? []).map((t) => t.id);
      const from = ids.indexOf(activeId);
      const to = ids.indexOf(overId);
      const reordered = arrayMove(ids, from, to);
      reorderWithinSection(reordered, col);
    } else {
      moveTaskToSection(activeId, overTask.section);
    }
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={onDragEnd} collisionDetection={closestCorners}>
        <SortableContext items={sortedColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <div className="grid md:grid-cols-4 gap-3">
            {sortedColumns.map((col) => (
              <SortableColumn
                key={col.id}
                column={col}
                tasks={tasksByCol[col.id] ?? []}
                onSettings={() => setEditingColumn(col.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editingColumn && (
        <ColumnCustomizationModal columnId={editingColumn} onClose={() => setEditingColumn(null)} />
      )}
    </>
  );
}
