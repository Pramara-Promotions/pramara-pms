import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MoreHorizontal, Paperclip, User, CheckCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Task, useTasks } from "../state/tasks.store";

export default function BoardCard({ task }:{ task: Task }){
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }
  const [menu, setMenu] = useState(false)
  const { setDrawerTask, deleteTasks, getSubtasksFor } = useTasks()

  const dueInfo = useMemo(() => {
    if (!task.due) return { label: null as string | null, className: "text-gray-500" };
    const today = new Date();
    const dueDate = new Date(task.due);
    const sameDay = dueDate.toDateString() === today.toDateString();
    const overdue = dueDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const label = dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return {
      label,
      className: overdue ? "text-red-600" : sameDay ? "text-amber-600" : "text-gray-500",
    };
  }, [task.due])

  const priorityBorder = task.priority === 'High' ? 'border-l-red-500' : task.priority === 'Med' ? 'border-l-amber-500' : 'border-l-gray-300'

  const subtasks = getSubtasksFor(task.id)
  const subtaskProgress = subtasks.length ? `${subtasks.filter(s=>s.completed).length}/${subtasks.length}` : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-xl border ${priorityBorder} border-l-4 px-3 py-2 bg-white shadow-sm hover:shadow cursor-grab active:cursor-grabbing text-sm relative group`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0" onClick={()=>setDrawerTask(task.id)}>
          <div className="font-medium text-gray-900 truncate cursor-pointer hover:text-indigo-600">{task.name}</div>
          <div className="mt-1 flex items-center gap-3 text-xs">
            {task.assignee && (
              <span className="flex items-center gap-1 text-gray-500">
                <span className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] text-white flex items-center justify-center">
                  {task.assignee.charAt(0).toUpperCase()}
                </span>
                {task.assignee}
              </span>
            )}
            {dueInfo.label && (
              <span className={`flex items-center gap-1 ${dueInfo.className}`}>
                <Calendar className="w-3.5 h-3.5" />
                {dueInfo.label}
              </span>
            )}
            {task.attachments && task.attachments > 0 && (
              <span className="flex items-center gap-1 text-gray-500">
                <Paperclip className="w-3.5 h-3.5" />
                {task.attachments}
              </span>
            )}
            {subtaskProgress && (
              <span className="flex items-center gap-1 text-gray-500">
                <CheckCircle className="w-3.5 h-3.5" />
                {subtaskProgress}
              </span>
            )}
          </div>
          {task.tags && task.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {task.tags.slice(0,2).map((tag,i)=>(
                <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px]">{tag}</span>
              ))}
              {task.tags.length>2 && <span className="text-[10px] text-gray-400">+{task.tags.length-2}</span>}
            </div>
          )}
        </div>
        <button className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity" onClick={()=>setMenu(m=>!m)}>
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      {menu && (
        <div className="absolute right-2 top-8 z-20 rounded-lg border bg-white shadow text-sm">
          <button className="block w-full text-left px-3 py-1.5 hover:bg-gray-50" onClick={()=>setDrawerTask(task.id)}>Open</button>
          <button className="block w-full text-left px-3 py-1.5 hover:bg-gray-50" onClick={()=>{ deleteTasks([task.id]) }}>Delete</button>
        </div>
      )}
    </div>
  )
}
