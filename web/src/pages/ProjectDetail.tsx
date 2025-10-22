// @ts-nocheck
import { useParams } from '@tanstack/react-router'
export default function ProjectDetail(){
  const { id } = useParams({ from: "/projects/$id" })
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Project {id}</h1>
        <div className="flex gap-2">
          <button className="rounded-lg border px-3 py-1.5 text-sm">Board</button>
          <button className="rounded-lg border px-3 py-1.5 text-sm">List</button>
          <button className="rounded-lg border px-3 py-1.5 text-sm">Timeline</button>
        </div>
      </div>
      <div className="rounded-2xl border p-4 text-sm text-gray-600">Project summary panel…</div>
    </div>
  )
}
