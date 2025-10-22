import * as React from "react";
import { useTasks } from "../tasks/state/tasks.store";

export default function CommandPalette({ open, onOpenChange }:{ open:boolean; onOpenChange:(b:boolean)=>void }){
  const { tasks, addTask } = useTasks()
  const [q,setQ] = React.useState("")
  const results = tasks.filter(t => t.name.toLowerCase().includes(q.toLowerCase())).slice(0,8)

  function createTaskQuick(){
    const id = `T-${Math.random().toString(36).slice(2,6).toUpperCase()}`
    addTask({ id, name: q || "New Task", section:"Pre-Prod", status:"green", updatedAt:new Date().toISOString().slice(0,10) })
    onOpenChange(false)
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] bg-black/40" onClick={()=>onOpenChange(false)}>
      <div className="mx-auto mt-24 w-[90vw] max-w-xl rounded-2xl border bg-white shadow-xl" onClick={e=>e.stopPropagation()}>
        <div className="border-b p-2">
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Type to search… (Enter to create task)"
            onKeyDown={(e)=>{ if(e.key==='Enter') createTaskQuick() }}
            className="w-full outline-none px-2 py-2 text-sm" />
        </div>
        <div className="max-h-80 overflow-auto">
          {results.length===0 ? <div className="p-3 text-sm text-gray-500">No results. Press Enter to create a task.</div> : results.map(r=>(
            <div key={r.id} className="px-3 py-2 text-sm hover:bg-gray-50">{r.name}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
