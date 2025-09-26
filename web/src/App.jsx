import { useEffect, useState } from 'react'

export default function App() {
  const [projects, setProjects] = useState([])
  const [active, setActive] = useState(null)
  const [qc, setQc] = useState([])
  const [alerts, setAlerts] = useState([])
  const [needs, setNeeds] = useState([])
  const [planOut, setPlanOut] = useState(null)
  const [rules, setRules] = useState([])

  useEffect(() => {
    fetch('/api/projects').then(r=>r.json()).then(setProjects)
  }, [])

  async function selectProject(p){
    setActive(p)
    const [qcRes, alRes, invRes, rlRes] = await Promise.all([
      fetch(`/api/projects/${p.id}/qc`),
      fetch(`/api/projects/${p.id}/alerts`),
      fetch(`/api/projects/${p.id}/inventory/needs`),
      fetch(`/api/projects/${p.id}/alert-rules`),
    ])
    setQc(await qcRes.json())
    setAlerts(await alRes.json())
    setNeeds(await invRes.json())
    setRules(await rlRes.json())
    setPlanOut(null)
  }

  async function saveRules(e){
    e.preventDefault()
    if(!active) return
    const rows = Array.from(document.querySelectorAll('[data-row]')).map(tr => {
      const key = tr.querySelector('[name=key]').value
      const level = tr.querySelector('[name=level]').value
      const threshold = Number(tr.querySelector('[name=threshold]').value || 0)
      const recipients = tr.querySelector('[name=recipients]').value.split(',').map(s=>s.trim()).filter(Boolean)
      const enabled = tr.querySelector('[name=enabled]').checked
      return { key, level, threshold, recipients, enabled }
    })
    const res = await fetch(`/api/projects/${active.id}/alert-rules`, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(rows)
    })
    const out = await res.json()
    if(!res.ok){ alert(out.error || 'Save rules failed'); return }
    setRules(out)
    alert('Rules saved')
  }

  async function postQC(e){
    e.preventDefault()
    if(!active) return
    const f = new FormData(e.currentTarget)
    const rejected = Number(f.get('rejected')||0)
    const reason = String(f.get('reason')||'').trim()
    if(rejected>0 && !reason){ alert('Please enter a reason when rejected > 0'); return }
    const payload = {
      batchCode: f.get('batchCode'),
      passed: Number(f.get('passed')||0),
      rejected,
      reason,
      pantoneMatch: f.get('pantoneMatch') || 'NA'
    }
    const res = await fetch(`/api/projects/${active.id}/qc`, {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
    })
    const body = await res.json()
    if(!res.ok){ alert(body.error || 'QC save failed'); return }
    const [qcRes, alRes] = await Promise.all([
      fetch(`/api/projects/${active.id}/qc`),
      fetch(`/api/projects/${active.id}/alerts`)
    ])
    setQc(await qcRes.json()); setAlerts(await alRes.json()); e.currentTarget.reset(); alert('QC saved')
  }

  function alertRowStyle(level){
    if(level==='RED') return { background:'#fee2e2', color:'#b91c1c', padding:'8px', borderRadius:6, marginBottom:6 }
    if(level==='AMBER') return { background:'#fff7ed', color:'#b45309', padding:'8px', borderRadius:6, marginBottom:6 }
    return { background:'#eef2ff', color:'#3730a3', padding:'8px', borderRadius:6, marginBottom:6 }
  }

  async function recomputeInventory(e){
    e.preventDefault()
    if(!active) return
    const f = new FormData(e.currentTarget)
    const items = []
    for(let i=1;i<=3;i++){
      const material = String(f.get(`m${i}`)||'').trim()
      const req = Number(f.get(`r${i}`)||0)
      const avail = Number(f.get(`a${i}`)||0)
      if(!material) continue
      items.push({ material, requiredQty: req, availableQty: avail })
    }
    if(items.length===0){ alert('Add at least one row'); return }
    const res = await fetch(`/api/projects/${active.id}/inventory/recompute`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ needs: items })
    })
    const body = await res.json()
    if(!res.ok){ alert(body.error || 'Recompute failed'); return }
    const [nRes, aRes] = await Promise.all([
      fetch(`/api/projects/${active.id}/inventory/needs`),
      fetch(`/api/projects/${active.id}/alerts`)
    ])
    setNeeds(await nRes.json()); setAlerts(await aRes.json()); e.currentTarget.reset(); alert('Inventory recomputed')
  }

  async function simulatePlan(e){
    e.preventDefault()
    if(!active) return
    const f = new FormData(e.currentTarget)
    const payload = {
      quantity: Number(f.get('quantity') || active.quantity),
      cutoffDate: f.get('cutoff') || active.cutoffDate,
      buffers: { shippingDays: Number(f.get('shipbuf')||2), qcDays: Number(f.get('qcbuf')||1) },
      stages: [
        { name:'Molding',  unitsPerDay: Number(f.get('mold') || 0) },
        { name:'Painting', unitsPerDay: Number(f.get('paint')|| 0) },
        { name:'Assembly', unitsPerDay: Number(f.get('assy') || 0) },
        { name:'Packing',  unitsPerDay: Number(f.get('pack') || 0) },
      ]
    }
    const res = await fetch(`/api/projects/${active.id}/plan/simulate`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    })
    const out = await res.json()
    if(!res.ok){ alert(out.error || 'Plan simulate failed'); return }
    setPlanOut(out)
  }

  async function refreshNeeds(){
    if(!active) return
    const nRes = await fetch(`/api/projects/${active.id}/inventory/needs`)
    setNeeds(await nRes.json())
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:'16px', padding:'16px', fontFamily:'system-ui, Arial' }}>
      <div>
        <h2>Projects</h2>
        <ul style={{ listStyle:'none', padding:0 }}>
          {projects.map(p=>(
            <li key={p.id} style={{ border:'1px solid #ddd', borderRadius:8, padding:12, marginBottom:8, background: active?.id===p.id ? '#eef6ff':'white', cursor:'pointer' }} onClick={()=>selectProject(p)}>
              <div><b>{p.code}</b> — {p.name}</div>
              <div style={{ fontSize:12, color:'#666' }}>SKU: {p.sku} • Qty: {p.quantity} • Cutoff: {new Date(p.cutoffDate).toLocaleDateString()}</div>
              {p.pantoneCode && <div style={{ fontSize:12 }}>Pantone: <b>{p.pantoneCode}</b></div>}
            </li>
          ))}
        </ul>
      </div>

      <div>
        {!active && <div>Select a project to view Dashboard.</div>}
        {active && (
          <>
            <h2>{active.code} — {active.name}</h2>

            {/* Planner */}
            <section style={{ border:'1px solid #ddd', borderRadius:8, padding:12, marginBottom:16 }}>
              <h3 style={{ marginTop:0 }}>Planner (backward from cutoff)</h3>
              <form onSubmit={simulatePlan}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  <label>Quantity <input name="quantity" type="number" defaultValue={active.quantity}/></label>
                  <label>Cutoff <input name="cutoff" type="datetime-local" defaultValue={new Date(active.cutoffDate).toISOString().slice(0,16)}/></label>
                  <label>Ship Buffer(d) <input name="shipbuf" type="number" defaultValue="2"/></label>
                  <label>Final QC(d) <input name="qcbuf" type="number" defaultValue="1"/></label>
                </div>
                <div style={{ marginTop:8, fontWeight:600 }}>Capacity (units/day)</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  <label>Molding <input name="mold" type="number" placeholder="12000"/></label>
                  <label>Painting <input name="paint" type="number" placeholder="15000"/></label>
                  <label>Assembly <input name="assy" type="number" placeholder="18000"/></label>
                  <label>Packing <input name="pack" type="number" placeholder="20000"/></label>
                </div>
                <button type="submit" style={{ marginTop:12, padding:'6px 10px' }}>Simulate</button>
              </form>

              {planOut && (
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:12, color:'#666' }}>Cutoff: {new Date(planOut.cutoffDate).toLocaleString()}</div>
                  <table style={{ width:'100%', borderCollapse:'collapse', marginTop:8 }}>
                    <thead><tr><th align="left">Scenario</th><th align="left">Risk</th><th align="left">Stage</th><th align="left">Start</th><th align="left">End</th><th align="right">Days</th><th align="right">Units/Day</th></tr></thead>
                    <tbody>
                      {planOut.scenarios.map(sc => (
                        <>
                          {sc.plan.map((row, idx) => (
                            <tr key={`${sc.multiplier}-${row.stage}-${idx}`} style={{ borderTop:'1px solid #eee' }}>
                              {idx===0 && (
                                <>
                                  <td rowSpan={sc.plan.length}>x{sc.multiplier}<div style={{ fontSize:12, color:'#666' }}>Slack: {sc.slackDays} d</div></td>
                                  <td rowSpan={sc.plan.length}>
                                    <span style={{
                                      padding:'2px 8px', borderRadius:999, fontSize:12, fontWeight:700,
                                      background: sc.risk==='RED' ? '#fee2e2' : sc.risk==='AMBER' ? '#fff7ed' : '#dcfce7',
                                      color: sc.risk==='RED' ? '#b91c1c' : sc.risk==='AMBER' ? '#b45309' : '#166534'
                                    }}>{sc.risk}</span>
                                  </td>
                                </>
                              )}
                              <td>{row.stage}</td>
                              <td>{new Date(row.startDate).toLocaleDateString()}</td>
                              <td>{new Date(row.endDate).toLocaleDateString()}</td>
                              <td align="right">{row.daysNeeded}</td>
                              <td align="right">{row.unitsPerDay}</td>
                            </tr>
                          ))}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* QC entry */}
              <section style={{ border:'1px solid #ddd', borderRadius:8, padding:12 }}>
                <h3 style={{ marginTop:0 }}>Post QC</h3>
                <form onSubmit={postQC}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <label>Batch Code <input name="batchCode" placeholder="BATCH-001" /></label>
                    <label>Passed <input name="passed" type="number" defaultValue="0" /></label>
                    <label>Rejected <input name="rejected" type="number" defaultValue="0" /></label>
                    <label>Reason <input name="reason" placeholder="e.g., paint defects (required if rejected > 0)" /></label>
                    <label>Pantone
                      <select name="pantoneMatch" defaultValue="NA">
                        <option value="Match">Match</option>
                        <option value="Mismatch">Mismatch</option>
                        <option value="NA">NA</option>
                      </select>
                    </label>
                  </div>
                  <button type="submit" style={{ marginTop:12, padding:'8px 12px' }}>Save QC</button>
                </form>
              </section>

              {/* Alerts */}
              <section style={{ border:'1px solid #ddd', borderRadius:8, padding:12 }}>
                <h3 style={{ marginTop:0 }}>Alerts</h3>
                {alerts.length===0 ? <div>No alerts.</div> : (
                  <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 8 }}>
                    {alerts.map(a => (
                      <div key={a.id} style={alertRowStyle(a.level)}>
                        <b>{a.level}</b> — {a.message}
                        <div style={{ fontSize:12, opacity:0.8 }}>{new Date(a.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Inventory */}
            <section style={{ border:'1px solid #ddd', borderRadius:8, padding:12, marginTop:16 }}>
              <h3 style={{ marginTop:0 }}>Inventory Needs</h3>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                <button onClick={refreshNeeds} style={{ padding:'6px 10px' }}>Refresh</button>
                <div style={{ fontSize:12, color:'#666' }}>Shows current required vs available and shortfall.</div>
              </div>
              {needs.length===0 ? <div>No needs posted yet.</div> : (
                <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:12 }}>
                  <thead><tr><th align="left">Material</th><th align="right">Required</th><th align="right">Available</th><th align="right">Shortfall</th><th align="left">Updated</th></tr></thead>
                  <tbody>
                    {needs.map(n=>(
                      <tr key={n.id||n.material} style={{ borderTop:'1px solid #eee' }}>
                        <td>{n.material}</td>
                        <td align="right">{n.requiredQty}</td>
                        <td align="right">{n.availableQty}</td>
                        <td align="right" style={{ color:n.shortfall>0?'#b45309':'#15803d' }}>{n.shortfall}</td>
                        <td>{new Date(n.updatedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <details>
                <summary style={{ cursor:'pointer', userSelect:'none' }}><b>Recompute needs (optional)</b> — up to 3 rows</summary>
                <form onSubmit={recomputeInventory} style={{ marginTop:12 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:8 }}>
                    <label>Material <input name="m1" placeholder="Packaging-Carton" /></label>
                    <label>Required <input name="r1" type="number" placeholder="50000" /></label>
                    <label>Available <input name="a1" type="number" placeholder="47000" /></label>
                    <label>Material <input name="m2" placeholder="Blister-Pack" /></label>
                    <label>Required <input name="r2" type="number" placeholder="50000" /></label>
                    <label>Available <input name="a2" type="number" placeholder="50000" /></label>
                    <label>Material <input name="m3" placeholder="Insert-Leaflet" /></label>
                    <label>Required <input name="r3" type="number" placeholder="50000" /></label>
                    <label>Available <input name="a3" type="number" placeholder="49000" /></label>
                  </div>
                  <button type="submit" style={{ marginTop:12, padding:'6px 10px' }}>Recompute</button>
                </form>
              </details>
            </section>

            {/* Rules editor */}
            <section style={{ border:'1px solid #ddd', borderRadius:8, padding:12, marginTop:16 }}>
              <h3 style={{ marginTop:0 }}>Alert Rules</h3>
              <form onSubmit={saveRules}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>
                      <th align="left">Key</th>
                      <th align="left">Level</th>
                      <th align="right">Threshold</th>
                      <th align="left">Recipients (comma-separated)</th>
                      <th align="left">Enabled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(r=>(
                      <tr key={r.id} data-row style={{ borderTop:'1px solid #eee' }}>
                        <td><input name="key" defaultValue={r.key} /></td>
                        <td>
                          <select name="level" defaultValue={r.level}>
                            <option>AMBER</option>
                            <option>RED</option>
                          </select>
                        </td>
                        <td align="right"><input name="threshold" type="number" defaultValue={r.threshold} style={{ textAlign:'right' }}/></td>
                        <td><input name="recipients" defaultValue={(() => { try { return JSON.parse(r.recipients||"[]").join(', ')} catch { return '' } })()} /></td>
                        <td><input name="enabled" type="checkbox" defaultChecked={r.enabled} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="submit" style={{ marginTop:12, padding:'6px 10px' }}>Save Rules</button>
              </form>
            </section>

            {/* QC table */}
            <section style={{ border:'1px solid #ddd', borderRadius:8, padding:12, marginTop:16 }}>
              <h3 style={{ marginTop:0 }}>QC Records</h3>
              {qc.length===0 ? <div>No QC yet.</div> : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr><th align="left">Batch</th><th align="right">Passed</th><th align="right">Rejected</th><th align="left">Reason</th><th align="left">Pantone</th><th align="left">Time</th></tr></thead>
                  <tbody>
                    {qc.map(r=>(
                      <tr key={r.id} style={{ borderTop:'1px solid #eee' }}>
                        <td>{r.batchCode || '-'}</td>
                        <td align="right">{r.passed}</td>
                        <td align="right">{r.rejected}</td>
                        <td>{r.reason}</td>
                        <td>{r.pantoneMatch}</td>
                        <td>{new Date(r.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
