// web/src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { http } from "../lib/http";

/** http already injects Authorization & handles refresh */
function api(path, options = {}) {
  return http(path, options);
}

/* -------------------- Tiny Toast -------------------- */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(1);
  function push(message, type = "info", ttl = 3000) {
    const id = idRef.current++;
    setToasts((p) => [...p, { id, message, type }]);
    if (ttl) {
      setTimeout(() => {
        setToasts((p) => p.filter((t) => t.id !== id));
      }, ttl);
    }
  }
  function remove(id) {
    setToasts((p) => p.filter((t) => t.id !== id));
  }
  return { toasts, push, remove };
}

function Toasts({ items, onClose }) {
  return (
    <div style={{ position: "fixed", top: 14, right: 14, zIndex: 9999, display: "grid", gap: 8 }}>
      {items.map((t) => (
        <div
          key={t.id}
          style={{
            background: t.type === "error" ? "#fee2e2" : t.type === "warn" ? "#fef3c7" : "#e0f2fe",
            border: "1px solid #e5e7eb",
            padding: "8px 12px",
            borderRadius: 8,
            minWidth: 240,
            boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
            <div style={{ color: "#0f172a", fontSize: 14 }}>{t.message}</div>
            <button
              onClick={() => onClose(t.id)}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "#334155" }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** ---------- UI helpers ---------- */
function Card({ title, actions, children, style }) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        background: "#fff",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>{actions}</div>
      </div>
      {children}
    </section>
  );
}

function Row({ left, right, mono, muted }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        padding: "8px 0",
        borderTop: "1px solid #f1f5f9",
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo" : undefined,
        color: muted ? "#64748b" : undefined,
      }}
    >
      <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{left}</div>
      <div style={{ marginLeft: 10 }}>{right}</div>
    </div>
  );
}

/* -------------------- Dashboard -------------------- */
export default function Dashboard() {
  const { toasts, push, remove } = useToasts();

  /* ---------- Theme (keep your behavior) ---------- */
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setDark(e.matches);
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    setDark(mq.matches);
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange);
    };
  }, []);

  /* ---------- Auth / RBAC ---------- */
  const [me, setMe] = useState(null);
  const [perms, setPerms] = useState(new Set());
  const isSuperAdmin = useMemo(() => {
    if (!me?.roles) return false;
    return me.roles.some((r) => r === "Super Admin" || r?.role === "Super Admin");
  }, [me]);
  function can(p) {
    return isSuperAdmin || perms.has(p);
  }

  useEffect(() => {
    (async () => {
      const token = sessionStorage.getItem("accessToken");
      if (!token) {
        window.location.href = "/login";
        return;
      }
      try {
        const r = await api("/api/me");
        if (r.ok) {
          const m = await r.json();
          setMe({
            id: m.id,
            email: m.email,
            roles: m.roles || [],
          });
          setPerms(new Set(m.permissions || []));
        } else if (r.status === 401) {
          sessionStorage.removeItem("accessToken");
          window.location.href = "/login";
        } else {
          push("Failed to load profile", "warn");
        }
      } catch {
        push("Failed to load profile", "warn");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Projects (left pane) ---------- */
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projErr, setProjErr] = useState("");

  const currentProject = useMemo(
    () => projects.find((p) => p.id === projectId) || null,
    [projects, projectId]
  );

  async function fetchProjects() {
    try {
      setLoadingProjects(true);
      setProjErr("");
      const res = await api("/api/projects");
      if (!res.ok) throw new Error(`GET /api/projects ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setProjects(list);
      if (list.length && !projectId) setProjectId(list[0].id);
    } catch (err) {
      console.error(err);
      setProjects([]);
      setProjErr("Could not load projects.");
    } finally {
      setLoadingProjects(false);
    }
  }

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Right-pane lists ---------- */
  const [inventoryNeeds, setInventoryNeeds] = useState([]);
  const [alertRules, setAlertRules] = useState([]);
  const [preprodItems, setPreprodItems] = useState([]);
  const [complianceItems, setComplianceItems] = useState([]);
  const [changes, setChanges] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [variances, setVariances] = useState([]);
  const [skus, setSkus] = useState([]);

  // SKU quick-add (existing project)
  const [skuAdd, setSkuAdd] = useState("");

  // New project form + multi-SKU tags
  const [newProj, setNewProj] = useState({
    code: "",
    name: "",
    sku: "",
    quantity: 0,
    cutoffDate: "", // yyyy-mm-dd
    pantoneCode: "",
  });
  const [creating, setCreating] = useState(false);
  const [skuInput, setSkuInput] = useState("");
  const [skuList, setSkuList] = useState([]);

  // Right pane quick-adds
  const [needText, setNeedText] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [ruleThreshold, setRuleThreshold] = useState("");
  const [preprodTask, setPreprodTask] = useState("");
  const [compTitle, setCompTitle] = useState("");
  const [changeDesc, setChangeDesc] = useState("");
  const [docName, setDocName] = useState("");
  const [fileObj, setFileObj] = useState(null);
  const [showAllVersions, setShowAllVersions] = useState(false);
  const [varianceDesc, setVarianceDesc] = useState("");

  /* ---------- Load right-pane data whenever project changes ---------- */
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const [inv, rules, pre, comp, chg, docs, vars, skuRows] = await Promise.all([
          api(`/api/projects/${projectId}/inventory/needs`).then((r) => r.json()).catch(() => []),
          api(`/api/projects/${projectId}/alert-rules`).then((r) => r.json()).catch(() => []),
          api(`/api/projects/${projectId}/preprod`).then((r) => r.json()).catch(() => []),
          api(`/api/projects/${projectId}/compliance`).then((r) => r.json()).catch(() => []),
          api(`/api/projects/${projectId}/changes`).then((r) => r.json()).catch(() => []),
          api(`/api/projects/${projectId}/documents?all=${showAllVersions ? "1" : "0"}`)
            .then((r) => r.json()).catch(() => []),
          api(`/api/projects/${projectId}/variances`).then((r) => r.json()).catch(() => []),
          api(`/api/projects/${projectId}/skus`).then((r) => r.json()).catch(() => []),
        ]);
        setInventoryNeeds(Array.isArray(inv) ? inv : []);
        setAlertRules(Array.isArray(rules) ? rules : []);
        setPreprodItems(Array.isArray(pre) ? pre : []);
        setComplianceItems(Array.isArray(comp) ? comp : []);
        setChanges(Array.isArray(chg) ? chg : []);
        setDocuments(Array.isArray(docs) ? docs : []);
        setVariances(Array.isArray(vars) ? vars : []);
        setSkus(Array.isArray(skuRows) ? skuRows : []);
      } catch (e) {
        console.error("Load project data failed:", e);
      }
    })();
  }, [projectId, showAllVersions]);

  /* ---------- Helpers ---------- */
  function addSkuFromInput() {
    const v = skuInput.trim();
    if (!v) return;
    if (!skuList.includes(v)) setSkuList((p) => [...p, v]);
    setSkuInput("");
  }
  function removeSkuTag(idx) {
    setSkuList((p) => p.filter((_, i) => i !== idx));
  }

  /* ---------- Create / Add handlers (with RBAC feedback) ---------- */
  async function createProject(e) {
    e.preventDefault();
    const payload = {
      code: newProj.code.trim(),
      name: newProj.name.trim(),
      sku: newProj.sku.trim() || null, // legacy single sku (safe to send)
      quantity: Number.isFinite(Number(newProj.quantity)) ? Number(newProj.quantity) : 0,
      cutoffDate: newProj.cutoffDate || null,
      pantoneCode: newProj.pantoneCode.trim() || null,
    };
    if (!payload.code || !payload.name) return push("Code and Name are required", "warn");

    try {
      setCreating(true);
      const res = await api("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 403) {
        push("You don’t have permission to create projects", "warn");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Create failed (${res.status})`);
      }
      const created = await res.json();

      // batch SKUs if we added tags on create (backend optional)
      if (skuList.length) {
        const r = await api(`/api/projects/${created.id}/skus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codes: skuList }),
        });
        if (r.status === 403) push("No permission to add SKUs", "warn");
      }

      setProjects((prev) => [created, ...prev]);
      setProjectId(created.id);
      setNewProj({ code: "", name: "", sku: "", quantity: 0, cutoffDate: "", pantoneCode: "" });
      setSkuList([]);
      setSkuInput("");
      push("Project created", "info");
    } catch (err) {
      console.error(err);
      push(err.message || "Could not create project", "error");
    } finally {
      setCreating(false);
    }
  }

  async function addNeed(e) {
    e.preventDefault();
    if (!needText.trim()) return push("Enter a need", "warn");
    const res = await api(`/api/projects/${projectId}/inventory/needs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: needText }),
    });
    if (res.status === 403) return push("No permission", "warn");
    if (!res.ok) return push("Failed to add need", "error");
    const created = await res.json();
    setInventoryNeeds((p) => [created, ...p]);
    setNeedText("");
  }

  async function addRule(e) {
    e.preventDefault();
    if (!ruleName.trim()) return push("Enter a rule name", "warn");
    const payload = {
      name: ruleName,
      threshold: ruleThreshold === "" ? null : Number(ruleThreshold),
    };
    const res = await api(`/api/projects/${projectId}/alert-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 403) return push("No permission", "warn");
    if (!res.ok) return push("Failed to add rule", "error");
    const created = await res.json();
    setAlertRules((p) => [created, ...p]);
    setRuleName("");
    setRuleThreshold("");
  }

  async function addPreprod(e) {
    e.preventDefault();
    if (!preprodTask.trim()) return push("Enter a task", "warn");
    const res = await api(`/api/projects/${projectId}/preprod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: preprodTask }),
    });
    if (res.status === 403) return push("No permission", "warn");
    if (!res.ok) return push("Failed to add pre-prod task", "error");
    const created = await res.json();
    setPreprodItems((p) => [created, ...p]);
    setPreprodTask("");
  }

  async function addCompliance(e) {
    e.preventDefault();
    if (!compTitle.trim()) return push("Enter a title", "warn");
    const res = await api(`/api/projects/${projectId}/compliance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: compTitle }),
    });
    if (res.status === 403) return push("No permission", "warn");
    if (!res.ok) return push("Failed to add compliance", "error");
    const created = await res.json();
    setComplianceItems((p) => [created, ...p]);
    setCompTitle("");
  }

  async function addChange(e) {
    e.preventDefault();
    if (!changeDesc.trim()) return push("Enter a description", "warn");
    const res = await api(`/api/projects/${projectId}/changes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: changeDesc }),
    });
    if (res.status === 403) return push("No permission", "warn");
    if (!res.ok) return push("Failed to add change", "error");
    const created = await res.json();
    setChanges((p) => [created, ...p]);
    setChangeDesc("");
  }

  async function addDocument(e) {
    e.preventDefault();
    if (!docName.trim()) return push("Name required", "warn");
    if (!fileObj) return push("Choose a file", "warn");

    if (!can("DOC_UPLOAD")) {
      return push("You don’t have permission to upload documents", "warn");
    }

    // 1) Ask API for a presigned PUT URL
    const initRes = await api(`/api/uploads/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        filename: fileObj.name,
        contentType: fileObj.type || "application/octet-stream",
      }),
    });
    if (initRes.status === 403) return push("No permission to upload", "warn");
    if (!initRes.ok) return push("Failed to init upload", "error");
    const { url, key } = await initRes.json();

    // 2) Upload the file directly to MinIO/S3
    const putRes = await fetch(url, {
      method: "PUT",
      body: fileObj,
      headers: { "Content-Type": fileObj.type || "application/octet-stream" },
    });
    if (!putRes.ok) return push("Upload failed", "error");

    // 3) Save a DB record (auto version++)
    const saveRes = await api(`/api/projects/${projectId}/documents/file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: docName.trim(),
        storageKey: key,
        contentType: fileObj.type || null,
      }),
    });
    if (saveRes.status === 403) return push("No permission to save document", "warn");
    if (!saveRes.ok) return push("Failed to save document", "error");
    const created = await saveRes.json();

    setDocuments((p) => [created, ...p]);
    setDocName("");
    setFileObj(null);
    push("Document uploaded", "info");
  }

  async function addVariance(e) {
    e.preventDefault();
    if (!varianceDesc.trim()) return push("Enter a description", "warn");
    const res = await api(`/api/projects/${projectId}/variances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: varianceDesc }),
    });
    if (res.status === 403) return push("No permission", "warn");
    if (!res.ok) return push("Failed to add variance", "error");
    const created = await res.json();
    setVariances((p) => [created, ...p]);
    setVarianceDesc("");
  }

  async function addSkuExisting(e) {
    e.preventDefault();
    if (!can("PROJECT_EDIT")) return push("You can’t edit project SKUs", "warn");
    const code = skuAdd.trim();
    if (!code) return;
    const res = await api(`/api/projects/${projectId}/skus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.status === 403) return push("No permission to add SKUs", "warn");
    if (!res.ok) return push("Failed to add SKU", "error");
    const created = await res.json();
    setSkus((p) => [created, ...p]);
    setSkuAdd("");
  }

  async function deleteSku(id) {
    if (!can("PROJECT_EDIT")) return push("You can’t edit project SKUs", "warn");
    if (!window.confirm("Remove this SKU?")) return;
    const res = await api(`/api/projects/${projectId}/skus/${id}`, { method: "DELETE" });
    if (res.status === 403) return push("No permission to delete SKUs", "warn");
    if (!res.ok) return push("Failed to delete SKU", "error");
    setSkus((p) => p.filter((x) => x.id !== id));
  }

  async function del(path, id, setList) {
    const res = await api(path, { method: "DELETE" });
    if (res.status === 403) return push("No permission to delete", "warn");
    if (!res.ok) return push("Delete failed", "error");
    setList((prev) => prev.filter((x) => String(x.id) !== String(id)));
  }

  /* ---------- styles ---------- */
  const grid = { display: "grid", gridTemplateColumns: "360px 1fr", minHeight: "calc(100vh - 56px)" };
  const leftPane = { borderRight: "1px solid #e5e7eb", padding: 16, background: "#fafafa" };

  return (
    <>
      <Toasts items={toasts} onClose={remove} />

      <div style={grid}>
        {/* LEFT PANE */}
        <aside style={leftPane}>
          {/* Create Project */}
          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
              background: "#fff",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center" }}>
              <h4 style={{ margin: "0 0 10px 0" }}>New Project</h4>
              {me && (
                <div style={{ justifySelf: "end", fontSize: 12, color: "#64748b" }}>
                  {isSuperAdmin ? "Role: Super Admin" : `Perms: ${Array.from(perms).length}`}
                </div>
              )}
            </div>

            <form onSubmit={createProject} style={{ display: "grid", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#64748b" }}>
                Code *
                <input
                  style={{ width: "100%", padding: 8, marginTop: 4 }}
                  value={newProj.code}
                  onChange={(e) => setNewProj((p) => ({ ...p, code: e.target.value }))}
                  placeholder="e.g. PMS-001"
                  disabled={false}
                />
              </label>

              <label style={{ fontSize: 12, color: "#64748b" }}>
                Name *
                <input
                  style={{ width: "100%", padding: 8, marginTop: 4 }}
                  value={newProj.name}
                  onChange={(e) => setNewProj((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. First Project"
                  disabled={false}
                />
              </label>

              {/* SKUs (multi) + Qty */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#64748b" }}>SKUs (multiple)</label>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <input
                      style={{ flex: 1, padding: 8 }}
                      value={skuInput}
                      onChange={(e) => setSkuInput(e.target.value)}
                      placeholder="Type SKU and press Add"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkuFromInput();
                        }
                      }}
                      disabled={!can("PROJECT_EDIT") && !isSuperAdmin} // optional gate on create-path
                    />
                    <button type="button" onClick={addSkuFromInput} disabled={!can("PROJECT_EDIT") && !isSuperAdmin}>
                      Add
                    </button>
                  </div>
                  {skuList.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {skuList.map((s, i) => (
                        <span
                          key={`${s}-${i}`}
                          style={{
                            background: "#eef2ff",
                            border: "1px solid #c7d2fe",
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                          }}
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() => removeSkuTag(i)}
                            style={{ marginLeft: 6, border: "none", background: "transparent", cursor: "pointer" }}
                            aria-label="Remove SKU"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <label style={{ fontSize: 12, color: "#64748b" }}>
                  Qty
                  <input
                    style={{ width: "100%", padding: 8, marginTop: 4 }}
                    value={newProj.quantity}
                    onChange={(e) => setNewProj((p) => ({ ...p, quantity: e.target.value }))}
                    inputMode="numeric"
                    placeholder="0"
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ fontSize: 12, color: "#64748b" }}>
                  Cutoff Date
                  <input
                    type="date"
                    style={{ width: "100%", padding: 8, marginTop: 4 }}
                    value={newProj.cutoffDate}
                    onChange={(e) => setNewProj((p) => ({ ...p, cutoffDate: e.target.value }))}
                  />
                </label>
                <label style={{ fontSize: 12, color: "#64748b" }}>
                  Pantone Code
                  <input
                    style={{ width: "100%", padding: 8, marginTop: 4 }}
                    value={newProj.pantoneCode}
                    onChange={(e) => setNewProj((p) => ({ ...p, pantoneCode: e.target.value }))}
                    placeholder="e.g. 186 C"
                  />
                </label>
              </div>

              <button type="submit" disabled={creating} style={{ padding: "8px 10px" }}>
                {creating ? "Creating…" : "Create"}
              </button>
            </form>
          </section>

          {/* Projects list */}
          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0" }}>Projects</h4>

            {projErr ? (
              <div style={{ color: "#b91c1c", fontSize: 14 }}>{projErr}</div>
            ) : loadingProjects ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>Loading projects…</div>
            ) : projects.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>
                No projects yet. Use the form above to create your first project.
              </div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {projects.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setProjectId(p.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        background: projectId === p.id ? "#eef2ff" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{p.name || `Project #${p.id}`}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {p.code || p.reference || "—"} {p.sku ? `• ${p.sku}` : ""} • Qty: {p.quantity}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        {/* RIGHT PANE */}
        <main style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
            <h2 style={{ margin: 0 }}>{currentProject?.name || (projectId ? `Project #${projectId}` : "Project")}</h2>
            {currentProject?.code && <code style={{ color: "#64748b" }}>{currentProject.code}</code>}
          </div>

          {/* SKUs */}
          <Card title="SKUs">
            {/* Hide the add form if user can’t edit project */}
            {can("PROJECT_EDIT") ? (
              <form onSubmit={addSkuExisting} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input
                  placeholder="Enter SKU code"
                  value={skuAdd}
                  onChange={(e) => setSkuAdd(e.target.value)}
                  style={{ flex: 1, padding: 8 }}
                />
                <button type="submit">Add</button>
              </form>
            ) : (
              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 10 }}>
                You don’t have permission to modify SKUs.
              </div>
            )}

            {skus.length === 0 ? (
              <div style={{ color: "#64748b" }}>No SKUs yet.</div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {skus.map((s) => (
                  <span
                    key={s.id}
                    style={{
                      background: "#eef2ff",
                      border: "1px solid #c7d2fe",
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {s.code}
                    {can("PROJECT_EDIT") && (
                      <button
                        onClick={() => deleteSku(s.id)}
                        style={{ border: "none", background: "transparent", cursor: "pointer" }}
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* INVENTORY NEEDS */}
          <Card title="Inventory Needs">
            <form onSubmit={addNeed} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                placeholder="Need description"
                value={needText}
                onChange={(e) => setNeedText(e.target.value)}
                style={{ flex: 1, padding: 8 }}
              />
              <button type="submit">Add</button>
            </form>

            {inventoryNeeds.length === 0 ? (
              <div style={{ color: "#64748b" }}>No needs yet.</div>
            ) : (
              inventoryNeeds.map((n) => (
                <Row
                  key={n.id}
                  left={<span>{n.text || n.description || JSON.stringify(n)}</span>}
                  right={
                    <button
                      onClick={() =>
                        del(`/api/projects/${projectId}/inventory/needs/${n.id}`, n.id, setInventoryNeeds)
                      }
                    >
                      Delete
                    </button>
                  }
                />
              ))
            )}
          </Card>

          {/* ALERT RULES */}
          <Card title="Alert Rules">
            <form
              onSubmit={addRule}
              style={{ display: "grid", gridTemplateColumns: "1fr 160px 100px", gap: 8, marginBottom: 10 }}
            >
              <input
                placeholder="Rule name"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                style={{ padding: 8 }}
              />
              <input
                placeholder="Threshold (number)"
                value={ruleThreshold}
                onChange={(e) => setRuleThreshold(e.target.value)}
                inputMode="numeric"
                style={{ padding: 8 }}
              />
              <button type="submit">Add</button>
            </form>

            {alertRules.length === 0 ? (
              <div style={{ color: "#64748b" }}>No rules yet.</div>
            ) : (
              alertRules.map((r) => (
                <Row
                  key={r.id}
                  left={
                    <span>
                      <b>{r.name || "Rule"}</b>{" "}
                      {r.threshold != null && <span style={{ color: "#64748b" }}>— threshold: {r.threshold}</span>}
                    </span>
                  }
                  right={
                    <button onClick={() => del(`/api/projects/${projectId}/alert-rules/${r.id}`, r.id, setAlertRules)}>
                      Delete
                    </button>
                  }
                />
              ))
            )}
          </Card>

          {/* PRE-PRODUCTION WORKFLOW */}
          <Card title="Pre-Production Workflow">
            <form onSubmit={addPreprod} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                placeholder="Task"
                value={preprodTask}
                onChange={(e) => setPreprodTask(e.target.value)}
                style={{ flex: 1, padding: 8 }}
              />
              <button type="submit">Add</button>
            </form>

            {preprodItems.length === 0 ? (
              <div style={{ color: "#64748b" }}>No pre-prod tasks yet.</div>
            ) : (
              preprodItems.map((t) => (
                <Row
                  key={t.id}
                  left={<span>{t.task || t.title || JSON.stringify(t)}</span>}
                  right={
                    <button onClick={() => del(`/api/projects/${projectId}/preprod/${t.id}`, t.id, setPreprodItems)}>
                      Delete
                    </button>
                  }
                />
              ))
            )}
          </Card>

          {/* COMPLIANCE TRACKER */}
          <Card title="Compliance Tracker">
            <form onSubmit={addCompliance} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                placeholder="Compliance item"
                value={compTitle}
                onChange={(e) => setCompTitle(e.target.value)}
                style={{ flex: 1, padding: 8 }}
              />
              <button type="submit">Add</button>
            </form>

            {complianceItems.length === 0 ? (
              <div style={{ color: "#64748b" }}>No compliance items yet.</div>
            ) : (
              complianceItems.map((c) => (
                <Row
                  key={c.id}
                  left={<span>{c.title || c.name || JSON.stringify(c)}</span>}
                  right={
                    <button onClick={() => del(`/api/projects/${projectId}/compliance/${c.id}`, c.id, setComplianceItems)}>
                      Delete
                    </button>
                  }
                />
              ))
            )}
          </Card>

          {/* CHANGE LOG */}
          <Card title="Change Log">
            <form onSubmit={addChange} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                placeholder="Describe change"
                value={changeDesc}
                onChange={(e) => setChangeDesc(e.target.value)}
                style={{ flex: 1, padding: 8 }}
              />
              <button type="submit">Add</button>
            </form>

            {changes.length === 0 ? (
              <div style={{ color: "#64748b" }}>No changes yet.</div>
            ) : (
              changes.map((c) => (
                <Row
                  key={c.id}
                  left={<span>{c.description || JSON.stringify(c)}</span>}
                  right={
                    <button onClick={() => del(`/api/projects/${projectId}/changes/${c.id}`, c.id, setChanges)}>
                      Delete
                    </button>
                  }
                />
              ))
            )}
          </Card>

          {/* DOCUMENT REPOSITORY */}
          <Card
            title="Document Repository"
            actions={
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={showAllVersions}
                  onChange={(e) => setShowAllVersions(e.target.checked)}
                />
                Show all versions
              </label>
            }
          >
            {/* Hide the upload form if user lacks DOC_UPLOAD */}
            {can("DOC_UPLOAD") ? (
              <form
                onSubmit={addDocument}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr 100px", gap: 8, marginBottom: 10 }}
              >
                <input
                  placeholder="Document name"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  style={{ padding: 8 }}
                />

                <input
                  type="file"
                  onChange={(e) => setFileObj(e.target.files?.[0] || null)}
                  style={{ padding: 6 }}
                />

                <button type="submit">Upload</button>
              </form>
            ) : (
              <div style={{ color: "#64748b", fontSize: 13, marginBottom: 10 }}>
                You don’t have permission to upload documents.
              </div>
            )}

            {documents.length === 0 ? (
              <div style={{ color: "#64748b" }}>No documents.</div>
            ) : (
              documents.map((d) => (
                <Row
                  key={d.id}
                  left={
                    <span>
                      <a
                        href="#"
                        onClick={async (ev) => {
                          ev.preventDefault();
                          if (!can("DOC_DOWNLOAD")) {
                            push("You don’t have permission to download documents", "warn");
                            return;
                          }
                          const r = await api(`/api/projects/${projectId}/documents/${d.id}/download`);
                          if (r.status === 403) return push("No permission to download", "warn");
                          if (!r.ok) return push("Download failed", "error");
                          const { url } = await r.json();
                          window.open(url, "_blank");
                        }}
                      >
                        {d.name || "Document"}
                      </a>
                      {d.version && <span style={{ color: "#64748b" }}> — v{d.version}</span>}
                    </span>
                  }
                  right={
                    can("DOC_DELETE") ? (
                      <button onClick={() => del(`/api/projects/${projectId}/documents/${d.id}`, d.id, setDocuments)}>
                        Delete
                      </button>
                    ) : null
                  }
                />
              ))
            )}
          </Card>

          {/* VARIANCE CHECK */}
          <Card title="Variance Check">
            <form onSubmit={addVariance} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                placeholder="Variance description"
                value={varianceDesc}
                onChange={(e) => setVarianceDesc(e.target.value)}
                style={{ flex: 1, padding: 8 }}
              />
              <button type="submit">Add</button>
            </form>

            {variances.length === 0 ? (
              <div style={{ color: "#64748b" }}>No variances recorded.</div>
            ) : (
              variances.map((v) => (
                <Row
                  key={v.id}
                  left={<span>{v.description || JSON.stringify(v)}</span>}
                  right={
                    <button onClick={() => del(`/api/projects/${projectId}/variances/${v.id}`, v.id, setVariances)}>
                      Delete
                    </button>
                  }
                />
              ))
            )}
          </Card>
        </main>
      </div>
    </>
  );
}
