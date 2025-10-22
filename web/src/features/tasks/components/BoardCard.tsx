import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Task, useTasks } from "../state/tasks.store";

export default function BoardCard({ task }:{ task: Task }){
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }
  const [menu, setMenu] = useState(false)
  const { setDrawerTask, deleteTasks } = useTasks()

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="rounded-xl border px-3 py-2 bg-white shadow-sm hover:shadow cursor-grab active:cursor-grabbing text-sm relative">
      <div className="flex items-center justify-between">
        <div onClick={()=>setDrawerTask(task.id)} className="cursor-pointer">{task.name}</div>
        <button className="p-1 hover:bg-gray-100 rounded" onClick={()=>setMenu(m=>!m)}><MoreHorizontal className="h-4 w-4" /></button>
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
