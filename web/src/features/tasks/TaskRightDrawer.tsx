import { useTasks } from "./state/tasks.store";
import { InlineDate, InlineSelect, InlineText } from "./components/InlineCell";

export default function TaskRightDrawer(){
  const { drawerTaskId, setDrawerTask, tasks, updateTask } = useTasks()
  const t = tasks.find(x => x.id===drawerTaskId)
  const close = ()=> setDrawerTask(null)
  if(!drawerTaskId || !t) return null

  return (
    <div className="fixed top-0 right-0 h-full w-full md:w-[420px] bg-white border-l shadow-xl z-50">
      <div className="h-14 border-b flex items-center justify-between px-3">
        <div className="text-sm font-semibold">Task {t.id}</div>
        <button className="border rounded-lg px-3 py-1.5 text-sm" onClick={close}>Close</button>
      </div>
      <div className="p-3 space-y-4 text-sm">
        <div className="rounded-2xl border p-3 space-y-2">
          <div className="text-xs text-gray-500">Name</div>
          <InlineText value={t.name} onChange={(v)=>updateTask(t.id,{ name:v })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-gray-500">Section</div>
            <InlineSelect value={t.section} onChange={(v)=>updateTask(t.id,{ section: v as any })} options={['Pre-Prod','Production','QC','Dispatch']} />
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-gray-500">Status</div>
            <InlineSelect value={t.status} onChange={(v)=>updateTask(t.id,{ status: v as any })} options={['green','amber','red']} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-gray-500">Assignee</div>
            <InlineText value={t.assignee ?? ''} onChange={(v)=>updateTask(t.id,{ assignee: v || undefined })} />
          </div>
          <div className="rounded-2xl border p-3">
            <div className="text-xs text-gray-500">Due</div>
            <InlineDate value={t.due} onChange={(v)=>updateTask(t.id,{ due: v || undefined })} />
          </div>
        </div>
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-gray-500">Priority</div>
          <InlineSelect value={t.priority ?? 'Med'} onChange={(v)=>updateTask(t.id,{ priority: v as any })} options={['Low','Med','High']} />
        </div>
        <div className="rounded-2xl border p-3">
          <div className="text-xs text-gray-500">Tags (comma sep)</div>
          <InlineText value={(t.tags ?? []).join(', ')} onChange={(v)=>updateTask(t.id,{ tags: v.split(',').map(s=>s.trim()).filter(Boolean) })} />
        </div>
        <div className="text-xs text-gray-500">Updated: {t.updatedAt ?? '-'}</div>
      </div>
    </div>
  )
}
