import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import BoardCard from "./BoardCard";
import { Task } from "../state/tasks.store";

export default function BoardColumn({ id, title, tasks }:{ id: string; title: string; tasks: Task[] }){
  return (
    <div className="rounded-2xl border p-3 bg-white min-h-[60vh]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-gray-500">{tasks.length}</div>
      </div>
      <div className="space-y-2">
        <SortableContext items={tasks.map(t=>t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(t => <BoardCard key={t.id} task={t} />)}
        </SortableContext>
      </div>
    </div>
  )
}
