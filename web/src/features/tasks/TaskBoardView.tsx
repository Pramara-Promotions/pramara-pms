import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import BoardColumn from "./components/BoardColumn";
import { Section, Task, useTasks } from "./state/tasks.store";

const COLUMNS: { id: Section; title: string }[] = [
  { id: "Pre-Prod", title: "Pre-Prod" },
  { id: "Production", title: "Production" },
  { id: "QC",        title: "QC" },
  { id: "Dispatch",  title: "Dispatch" },
];

export default function TaskBoardView() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { tasks, moveTaskToSection, reorderWithinSection, filters } = useTasks()

  const filtered = useMemo(()=> {
    return tasks.filter(t => {
      if (filters.section && filters.section!=='All' && t.section!==filters.section) return false
      if (filters.assignee && filters.assignee!=='All' && (t.assignee ?? '')!==filters.assignee) return false
      if (filters.status && filters.status!=='All' && t.status!==filters.status) return false
      if (filters.tag && filters.tag!=='All' && !(t.tags ?? []).includes(filters.tag)) return false
      if (filters.q && !t.name.toLowerCase().includes(filters.q.toLowerCase())) return false
      return true
    })
  }, [tasks, filters])

  const tasksByCol = useMemo(
    () =>
      COLUMNS.reduce<Record<string, Task[]>>((acc, c) => {
        acc[c.id] = filtered.filter((t) => t.section === c.id);
        return acc;
      }, {}),
    [filtered]
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id)
    const overId = String(over.id)

    const overIsColumn = COLUMNS.some(c => c.id === overId)
    if (overIsColumn) {
      moveTaskToSection(activeId, overId as Section)
      return
    }

    const all = filtered
    const activeTask = all.find(t => t.id===activeId)
    const overTask   = all.find(t => t.id===overId)
    if (!activeTask || !overTask) return

    if (activeTask.section === overTask.section) {
      const col = activeTask.section
      const ids = (tasksByCol[col] ?? []).map(t => t.id)
      const from = ids.indexOf(activeId)
      const to   = ids.indexOf(overId)
      const reordered = arrayMove(ids, from, to)
      reorderWithinSection(reordered, col)
    } else {
      moveTaskToSection(activeId, overTask.section)
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid md:grid-cols-4 gap-3">
        {COLUMNS.map((col) => (
          <div key={col.id}>
            {/* Column header drop target handled via onDragEnd (overId === column id) */}
            <BoardColumn id={col.id} title={col.title} tasks={tasksByCol[col.id] ?? []} />
          </div>
        ))}
      </div>
    </DndContext>
  );
}
