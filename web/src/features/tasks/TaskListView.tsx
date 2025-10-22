import { useMemo } from 'react'
import { createColumnHelper, getCoreRowModel, useReactTable, flexRender } from '@tanstack/react-table'
import { useTasks, Task } from './state/tasks.store'
import { InlineDate, InlineSelect, InlineText } from './components/InlineCell'
import BulkBar from './components/BulkBar'
import TaskRightDrawer from './TaskRightDrawer'

const column = createColumnHelper<Task>()

export default function TaskListView(){
  const { tasks, updateTask, selection, toggleSelect, setDrawerTask, filters } = useTasks()

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

  const columns = useMemo(() => [
    column.display({
      id: 'sel',
      header: () => <input type="checkbox" onChange={(e)=> {/* could implement select all if needed */}} />,
      cell: i => {
        const id = i.row.original.id
        const checked = selection.includes(id)
        return <input type="checkbox" checked={checked} onChange={()=>toggleSelect(id)} />
      }
    }),
    column.accessor('name', { header:'Task', cell: i => <InlineText value={i.getValue()} onChange={(v)=>updateTask(i.row.original.id, { name: v })} /> }),
    column.accessor('section', { header:'Section', cell: i => <InlineSelect value={i.getValue()} onChange={(v)=>updateTask(i.row.original.id,{ section: v as any })} options={['Pre-Prod','Production','QC','Dispatch']} /> }),
    column.accessor('status', { header:'Status', cell: i => <InlineSelect value={i.getValue()} onChange={(v)=>updateTask(i.row.original.id,{ status: v as any })} options={['green','amber','red']} /> }),
    column.accessor('assignee', { header:'Assignee', cell: i => <InlineText value={i.getValue() ?? ''} onChange={(v)=>updateTask(i.row.original.id,{ assignee: v || undefined })} /> }),
    column.accessor('due', { header:'Due', cell: i => <InlineDate value={i.getValue()} onChange={(v)=>updateTask(i.row.original.id,{ due: v || undefined })} /> }),
    column.accessor('priority', { header:'Priority', cell: i => <InlineSelect value={i.getValue() ?? 'Med'} onChange={(v)=>updateTask(i.row.original.id,{ priority: v as any })} options={['Low','Med','High']} /> }),
    column.accessor('updatedAt', { header:'Updated', cell: i => <span className="text-xs text-gray-500">{i.getValue() ?? ''}</span> }),
    column.display({ id:'open', header:'', cell: i => <button className="text-accent" onClick={()=>setDrawerTask(i.row.original.id)}>Open</button> })
  ], [selection])

  const table = useReactTable({ data: filtered, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="space-y-3">
      <BulkBar />
      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(hg=>(
              <tr key={hg.id}>{hg.headers.map(h=>(
                <th key={h.id} className="px-3 py-2 text-left">{flexRender(h.column.columnDef.header, h.getContext())}</th>
              ))}</tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(r=>(
              <tr key={r.id} className="border-t hover:bg-gray-50">
                {r.getVisibleCells().map(c=>(
                  <td key={c.id} className="px-3 py-2">{flexRender(c.column.columnDef.cell, c.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TaskRightDrawer />
    </div>
  )
}
