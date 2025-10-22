import { useTasks } from "../state/tasks.store";

export default function BulkBar(){
  const { selection, selectMany, deleteTasks, moveTaskToSection, sections } = useTasks()

  function bulkDelete(){ if (selection.length) deleteTasks(selection) }
  function bulkMove(section:string){
    selection.forEach(id => moveTaskToSection(id as string, section as any))
    selectMany(selection, false)
  }

  if (selection.length===0) return null
  return (
    <div className="sticky top-16 z-20 rounded-2xl border bg-white shadow p-3 flex items-center gap-2">
      <div className="text-sm">{selection.length} selected</div>
      <div className="h-5 border-l mx-1" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Move to</span>
        {sections.map(s => (
          <button key={s} className="border rounded-lg px-2 py-1 text-xs hover:bg-gray-50" onClick={()=>bulkMove(s)}>{s}</button>
        ))}
      </div>
      <div className="flex-1" />
      <button className="border rounded-lg px-2 py-1 text-xs hover:bg-gray-50" onClick={bulkDelete}>Delete</button>
    </div>
  )
}
