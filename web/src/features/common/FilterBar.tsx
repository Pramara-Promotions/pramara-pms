import { useTasks } from "../tasks/state/tasks.store";

export default function FilterBar(){
  const { filters, setFilters, sections } = useTasks()
  const assignees = ["All","Vinod","Team A","QA-1","Ops"]
  const tags = ["All","PPS","Paint","QC","Pack"]

  return (
    <div className="rounded-2xl border p-3 flex flex-wrap items-center gap-2 sticky top-2 bg-white/70 backdrop-blur">
      <select className="border rounded-lg px-2 py-1.5 text-sm" value={filters.section ?? 'All'} onChange={e=>setFilters({ section: e.target.value as any })}>
        <option value="All">All sections</option>
        {sections.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className="border rounded-lg px-2 py-1.5 text-sm" value={filters.assignee ?? 'All'} onChange={e=>setFilters({ assignee: e.target.value as any })}>
        {assignees.map(a => <option key={a} value={a}>{a==='All'?'All assignees':a}</option>)}
      </select>
      <select className="border rounded-lg px-2 py-1.5 text-sm" value={filters.status ?? 'All'} onChange={e=>setFilters({ status: e.target.value as any })}>
        <option value="All">All status</option>
        <option value="green">Green</option>
        <option value="amber">Amber</option>
        <option value="red">Red</option>
      </select>
      <select className="border rounded-lg px-2 py-1.5 text-sm" value={filters.tag ?? 'All'} onChange={e=>setFilters({ tag: e.target.value as any })}>
        {tags.map(t => <option key={t} value={t}>{t==='All'?'All tags':t}</option>)}
      </select>
      <input
        className="border rounded-lg px-2 py-1.5 text-sm"
        placeholder="Search (q)"
        value={filters.q ?? ""}
        onChange={e=>setFilters({ q: e.target.value })}
      />
    </div>
  )
}
