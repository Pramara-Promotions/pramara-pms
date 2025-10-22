import { useEffect, useRef, useState } from "react";

export function InlineText({ value, onChange }:{ value:string; onChange:(v:string)=>void }){
  const [v,setV] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(()=>{ setV(value) },[value])
  return <input ref={ref} className="bg-transparent outline-none w-full" value={v} onChange={e=>setV(e.target.value)} onBlur={()=>onChange(v)} />
}

export function InlineSelect({ value, onChange, options }:{ value:string; onChange:(v:string)=>void; options:string[] }){
  return (
    <select className="bg-transparent outline-none" value={value ?? ""} onChange={e=>onChange(e.target.value)}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export function InlineDate({ value, onChange }:{ value?:string; onChange:(v:string)=>void }){
  return <input type="date" className="bg-transparent outline-none" value={value ?? ""} onChange={e=>onChange(e.target.value)} />
}
