// @ts-nocheck
import { Link } from '@tanstack/react-router'
export default function Projects(){
  const data = [
    { id:'P-001', name:'GOGOS', rag:'green', cutoff:'2025-11-20' },
    { id:'P-002', name:'Kids Toy Set', rag:'amber', cutoff:'2025-11-10' },
  ]
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Projects</h1>
      <div className="rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:py-2">
              <th>Project</th><th>Status</th><th>Cutoff</th>
            </tr>
          </thead>
          <tbody>
            {data.map(r=>(
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2"><Link to={"/projects/$id"} params={{ id: String(r.id) }} className="text-accent">{r.name}</Link></td>
                <td className="px-3 py-2">
                  <span className={`inline-block h-2 w-2 rounded-full mr-2 ${r.rag==='green'?'bg-rag-green':r.rag==='amber'?'bg-rag-amber':'bg-rag-red'}`} />
                  {r.rag}
                </td>
                <td className="px-3 py-2">{r.cutoff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
