import * as React from "react";
import { useTasks } from "../tasks/state/tasks.store";

export default function QuickAddModal({ open, onOpenChange }:{ open:boolean; onOpenChange:(b:boolean)=>void }){
  const { addTask, sections } = useTasks()
  const [name,setName] = React.useState("")
  const [section,setSection] = React.useState(sections[0])
  const [assignee,setAssignee] = React.useState("")
  const [due,setDue] = React.useState("")

  function submit(){
    if(!name.trim()) return
    const id = `T-${Math.random().toString(36).slice(2,6).toUpperCase()}`
    addTask({ id, name, section, assignee: assignee || undefined, due: due || undefined, status:"green", updatedAt:new Date().toISOString().slice(0,10) })
    onOpenChange(false); setName(""); setAssignee(""); setDue("")
  }

  if(!open) return null
  return (
    <div className="fixed inset-0 z-[60] bg-black/40" onClick={()=>onOpenChange(false)}>
      <div className="mx-auto mt-24 w-[90vw] max-w-md rounded-2xl border bg-white shadow-xl" onClick={e=>e.stopPropagation()}>
        <div className="border-b p-3 text-sm font-semibold">New Task</div>
        <div className="p-3 space-y-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">Name</div>
            <input value={name} onChange={e=>setName(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-gray-500">Section</div>
              <select value={section} onChange={e=>setSection(e.target.value as any)} className="w-full border rounded-lg px-2 py-1.5">
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-500">Assignee</div>
              <input value={assignee} onChange={e=>setAssignee(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 outline-none" placeholder="e.g. Vinod" />
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Due date</div>
            <input type="date" value={due} onChange={e=>setDue(e.target.value)} className="w-full border rounded-lg px-2 py-1.5" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="border rounded-lg px-3 py-1.5" onClick={()=>onOpenChange(false)}>Cancel</button>
            <button className="border rounded-lg px-3 py-1.5 bg-gray-100" onClick={submit}>Create</button>
          </div>
        </div>
      </div>
    </div>
  )
}
