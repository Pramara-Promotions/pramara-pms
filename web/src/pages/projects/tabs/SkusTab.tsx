// web/src/pages/projects/tabs/SkusTab.tsx
// @ts-nocheck

/****************************************************
 * [LMK-01] IMPORTS
 ****************************************************/
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../../../ui/toast/ToastProvider";
import { useProjectContext } from "../ProjectContext";

/****************************************************
 * [LMK-02] TYPES
 ****************************************************/
type Project = { id: number; name: string; code: string };
type SKU = {
  id: number;
  poNumber: string | null;
  code: string;
  name?: string | null;
  color?: string | null;
  type?: string | null;
  orderQty?: number | null;
  imageUrl?: string | null;               // preview-only (not persisted)
  attributes?: Record<string, string>;
};
type PurchaseOrderRef = { poNumber: string; url: string | null; createdAt: string };

/****************************************************
 * [LMK-03] CONSTANTS / UTILITIES
 ****************************************************/
const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL?.replace(/\/$/, "") ||
  "http://localhost:4000";

function fetchJson(url: string, init?: RequestInit) {
  return fetch(url, init).then(async (r) => {
    const text = await r.text();
    try {
      const js = text ? JSON.parse(text) : {};
      if (!r.ok) throw js || { error: `HTTP ${r.status}` };
      return js;
    } catch {
      if (!r.ok) throw { error: text || `HTTP ${r.status}` };
      return {};
    }
  });
}

/****************************************************
 * [LMK-04] COMPONENT ROOT
 ****************************************************/
export default function SkusTab() {
  const project = useProjectContext();
  const { showToastOk, showToastErr } = useToast();
  if (!project) return <div className="text-sm text-gray-500">Loading project…</div>;

  /****************************************************
   * [LMK-05] STATE – TABLE + LAYOUT MEMORY
   ****************************************************/
  const [skus, setSkus] = useState<SKU[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [attrKeys, setAttrKeys] = useState<string[]>([]);  // saved layout
  const [lastPo, setLastPo] = useState<string | null>(null);

  // PO panel
  const [poList, setPoList] = useState<PurchaseOrderRef[]>([]);
  const [poLoading, setPoLoading] = useState(false);

  /****************************************************
   * [LMK-06] STATE – FILTERS / SORT
   ****************************************************/
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"po" | "code" | "name">("po");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  /****************************************************
   * [LMK-07] STATE – MODAL + FORM (CREATE/EDIT)
   ****************************************************/
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingSku, setEditingSku] = useState<SKU | null>(null);

  const [form, setForm] = useState<any>({
    poNumber: "",
    poPdfFile: null as File | null, // required if PO missing
    code: "",
    name: "",
    color: "",
    type: "",
    orderQty: "",
    imageFile: null as File | null,  // preview only
    attrs: {} as Record<string, string>,
  });

  /****************************************************
 * [LMK-07A] STATE – DELETE CONFIRM
 ****************************************************/
const [confirmOpen, setConfirmOpen] = useState(false);
const [skuPendingDelete, setSkuPendingDelete] = useState<SKU | null>(null);
const [deleting,   setDeleting]   = useState(false);

function askDeleteSku(sku: SKU) {
  setSkuPendingDelete(sku);
  setConfirmOpen(true);
}
function cancelDelete() {
  setConfirmOpen(false);
  setSkuPendingDelete(null);
}

  /****************************************************
   * [LMK-08] PO LOOKUP (DEBOUNCED STATE)
   ****************************************************/
  const [poProbe, setPoProbe] = useState<{
    checking: boolean;
    exists: boolean | null;
    url?: string | null;
  }>({ checking: false, exists: null, url: null });
  const poDebRef = useRef<number | undefined>(undefined);

  /****************************************************
   * [LMK-09] INITIAL LOAD (SKUs + LAYOUT + POs)
   ****************************************************/
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [rows, layout] = await Promise.all([
          fetchJson(`${API_BASE}/api/project-skus?projectId=${project.id}`, {
            credentials: "include",
          }),
          fetchJson(`${API_BASE}/api/projects/${project.id}/sku-attribute-layout`, {
            credentials: "include",
          }),
        ]);
        if (!alive) return;
        setSkus(Array.isArray(rows) ? rows : []);
        setAttrKeys(Array.isArray(layout?.keys) ? layout.keys : []);
        setLastPo(layout?.lastPo || null);
      } catch (e: any) {
        if (alive) setErr(e?.error || e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    (async () => {
      try {
        setPoLoading(true);
        const pos = await fetchJson(`${API_BASE}/api/projects/${project.id}/pos`, {
          credentials: "include",
        });
        if (alive) setPoList(Array.isArray(pos) ? pos : []);
      } catch {
        if (alive) setPoList([]);
      } finally {
        if (alive) setPoLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [project.id]);

  /****************************************************
   * [LMK-10] HELPERS — FORM + SORT
   ****************************************************/
  function onChange(field: string, v: any) {
    setForm((f: any) => ({ ...f, [field]: v }));
  }
  function onAttrChange(k: string, v: string) {
    setForm((f: any) => ({ ...f, attrs: { ...f.attrs, [k]: v } }));
  }
  function toggleSort(col: "po" | "code" | "name") {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  }

  /****************************************************
   * [LMK-11] PO LOOKUP (DEBOUNCED ON BLUR)
   ****************************************************/
  const checkPoExists = (po: string) => {
    window.clearTimeout(poDebRef.current);
    const val = (po || "").trim();
    if (!val) {
      setPoProbe({ checking: false, exists: null, url: null });
      return;
    }
    poDebRef.current = window.setTimeout(async () => {
      setPoProbe((p) => ({ ...p, checking: true }));
      try {
        const js = await fetchJson(
          `${API_BASE}/api/projects/${project.id}/po/${encodeURIComponent(val)}`,
          { credentials: "include" }
        );
        setPoProbe({ checking: false, exists: !!js?.exists, url: js?.url || null });
      } catch {
        setPoProbe({ checking: false, exists: null, url: null });
      }
    }, 250);
  };

  /****************************************************
   * [LMK-12] SAVE LAYOUT
   ****************************************************/
  async function saveLayout(keys: string[]) {
    setAttrKeys(keys);
    try {
      await fetchJson(
        `${API_BASE}/api/projects/${project.id}/sku-attribute-layout`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys }),
        }
      );
    } catch { /* optimistic */ }
  }

  /****************************************************
   * [LMK-13] OPEN MODAL — CREATE / EDIT
   ****************************************************/
  function openCreateModal() {
    setMode("create");
    setEditingSku(null);
    setForm({
      poNumber: lastPo || "",
      poPdfFile: null,
      code: "",
      name: "",
      color: "",
      type: "",
      orderQty: "",
      imageFile: null,
      attrs: Object.fromEntries(attrKeys.map((k) => [k, ""])),
    });
    setPoProbe({ checking: false, exists: null, url: null });
    setOpen(true);
  }

  function openEditModal(sku: SKU) {
    setMode("edit");
    setEditingSku(sku);
    const mergedAttrs: Record<string, string> = { ...(sku.attributes || {}) };
    for (const k of attrKeys) if (!(k in mergedAttrs)) mergedAttrs[k] = "";
    setForm({
      poNumber: sku.poNumber || "",
      poPdfFile: null,
      code: sku.code,
      name: sku.name || "",
      color: sku.color || "",
      type: sku.type || "",
      orderQty: sku.orderQty == null ? "" : String(sku.orderQty),
      imageFile: null,
      attrs: mergedAttrs,
    });
    setPoProbe({ checking: false, exists: null, url: null });
    setOpen(true);
  }

  /****************************************************
   * [LMK-14] UPLOAD — PO PDF (PRESIGN + CONFIRM; LEGACY FALLBACK)
   ****************************************************/
  async function uploadPoIfNeeded(poNumber: string, poPdfFile: File | null): Promise<void> {
    if (poProbe.exists === true) return; // already known exists
    if (!poNumber) throw new Error("PO number is required.");
    if (poProbe.exists === false && !poPdfFile) {
      throw new Error("Upload the PO PDF to register this PO number.");
    }
    if (!poPdfFile) return;

    try {
      const presign = await fetchJson(
        `${API_BASE}/api/projects/${project.id}/po/presign`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            poNumber,
            filename: poPdfFile.name,
            contentType: poPdfFile.type || "application/pdf",
            sizeBytes: poPdfFile.size || undefined,
          }),
        }
      );

      if (presign?.putUrl && presign?.key) {
        await fetch(presign.putUrl, {
          method: "PUT",
          headers: { "Content-Type": poPdfFile.type || "application/pdf" },
          body: poPdfFile,
        });

        await fetchJson(`${API_BASE}/api/projects/${project.id}/po/confirm`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ poNumber, key: presign.key }),
        });

        setLastPo(poNumber);
        setPoProbe({ checking: false, exists: true, url: null });

        // refresh PO list
        try {
          const pos = await fetchJson(`${API_BASE}/api/projects/${project.id}/pos`, {
            credentials: "include",
          });
          setPoList(Array.isArray(pos) ? pos : []);
        } catch { /* no-op */ }
        return;
      }
    } catch { /* fall back */ }

    // Legacy multipart
    const fd = new FormData();
    fd.append("poNumber", poNumber);
    fd.append("file", poPdfFile, poPdfFile.name);
    const legacy = await fetch(`${API_BASE}/api/projects/${project.id}/po`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    if (!legacy.ok) {
      const txt = await legacy.text();
      throw new Error(txt || "PO upload failed");
    }
    setLastPo(poNumber);
    setPoProbe({ checking: false, exists: true, url: null });
    try {
      const pos = await fetchJson(`${API_BASE}/api/projects/${project.id}/pos`, {
        credentials: "include",
      });
      setPoList(Array.isArray(pos) ? pos : []);
    } catch { /* no-op */ }
  }

  /****************************************************
   * [LMK-15] UPLOAD — SKU IMAGE (OPTIONAL; PREVIEW ONLY)
   ****************************************************/
  async function uploadImageIfAny(): Promise<string | null> {
    if (!form.imageFile) return null;
    try {
      const presign = await fetchJson(
        `${API_BASE}/api/projects/${project.id}/sku-image/presign`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: form.imageFile.name,
            contentType: form.imageFile.type || "application/octet-stream",
            sizeBytes: form.imageFile.size || undefined,
          }),
        }
      );
      if (presign?.putUrl && presign?.key) {
        await fetch(presign.putUrl, {
          method: "PUT",
          headers: { "Content-Type": form.imageFile.type || "application/octet-stream" },
          body: form.imageFile,
        });
        return presign.publicUrl || presign.key || null;
      }
    } catch { /* fall back */ }

    const fd = new FormData();
    fd.append("file", form.imageFile, form.imageFile.name);
    fd.append("filename", `${form.code}_${Date.now()}_${form.imageFile.name}`);
    const res = await fetch(`${API_BASE}/api/projects/${project.id}/sku-image`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    if (!res.ok) throw new Error("Image upload failed");
    const js = await res.json();
    return js.url || js.publicUrl || null;
  }

  /****************************************************
   * [LMK-16] VALIDATION + CREATE/EDIT SUBMIT
   ****************************************************/
  const [modalError, setModalError] = useState<string | null>(null);

  function validateForm(): string | null {
    const po = String(form.poNumber ?? "").trim();
    if (!po) return "PO number is mandatory.";
    if (!String(form.code ?? "").trim()) return "SKU code is required.";
    if (poProbe.exists === false && !form.poPdfFile)
      return "PO PDF is required because this PO is not on file.";
    return null;
  }

  async function submitCreateOrEdit() {
    if (!open) return;
    setModalError(null);

    const poChanged =
      mode === "edit" ? (editingSku?.poNumber || "") !== (form.poNumber || "") : true;
    if (poChanged) await new Promise((r) => setTimeout(r, 0));

    const validationError = validateForm();
    if (validationError) { setModalError(validationError); return; }

    try {
      setSaving(true);
      const po = String(form.poNumber ?? "").trim();

      if (mode === "create" || poChanged) {
        await uploadPoIfNeeded(po, form.poPdfFile);
      }

      const imageUrl = await uploadImageIfAny(); // preview only

      const cleanAttrs: Record<string, string> = {};
      Object.entries(form.attrs || {}).forEach(([k, v]) => {
        if (String(v ?? "").trim() !== "") cleanAttrs[k] = String(v);
      });

      const payload = {
        projectId: project.id,
        poNumber: po,
        code: form.code.trim(),
        name: form.name || undefined,
        color: form.color || undefined,
        type: form.type || undefined,
        orderQty: form.orderQty ? Number(form.orderQty) : undefined,
        imageUrl: imageUrl || undefined, // UI-only
        attributesJson: JSON.stringify(cleanAttrs),
      };

      if (mode === "create") {
        const res = await fetch(`${API_BASE}/api/project-skus`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const js = await res.json().catch(() => ({}));
          if (js?.needsPO) { setModalError("PO not found. Please upload the PO PDF."); return; }
          throw new Error(js?.error || "Create SKU failed");
        }
        const sku = await res.json();
        setSkus((rows) => [...rows, sku]);
        setLastPo(po);
        setOpen(false);
        showToastOk(`SKU “${sku.code}” created.`);
      } else {
        const res = await fetch(`${API_BASE}/api/project-skus/${editingSku!.id}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const js = await res.json().catch(() => ({}));
          if (js?.needsPO) { setModalError("PO not found. Please upload the PO PDF."); return; }
          throw new Error(js?.error || "Update SKU failed");
        }
        const sku = await res.json();
        setSkus((rows) => rows.map((r) => (r.id === sku.id ? sku : r)));
        setLastPo(po);
        setOpen(false);
        showToastOk(`SKU “${sku.code}” updated.`);
      }
    } catch (e: any) {
      setModalError(e?.message || "Save failed");
      showToastErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

/****************************************************
 * [LMK-17] ACTION — DELETE SKU
 ****************************************************/
async function performDeleteSku() {
  if (!skuPendingDelete) return;
  try {
    setDeleting(true);
    const r = await fetch(`${API_BASE}/api/project-skus/${skuPendingDelete.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(txt || `Delete failed (${r.status})`);
    }
    setSkus((list) => list.filter((x) => x.id !== skuPendingDelete.id));
    showToastOk(`SKU “${skuPendingDelete.code}” deleted.`);
    setConfirmOpen(false);
    setSkuPendingDelete(null);
  } catch (e: any) {
    showToastErr(e?.message || "Delete failed");
  } finally {
    setDeleting(false);
  }
}
  /****************************************************
   * [LMK-18] TABLE — attrColumns + FILTERED/SORTED LIST
   ****************************************************/
  const attrColumns = useMemo(() => {
    const ordered = [...attrKeys];
    const dataKeys = new Set<string>();
    for (const s of skus) {
      const attrs = s?.attributes || {};
      for (const [k, v] of Object.entries(attrs)) {
        const hasValue = v !== null && v !== undefined && String(v).trim() !== "";
        if (hasValue) dataKeys.add(k);
      }
    }
    for (const k of dataKeys) if (!ordered.includes(k)) ordered.push(k);
    return ordered;
  }, [attrKeys, skus]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = skus.filter((s) => {
      if (!q) return true;
      const hay = [
        s.poNumber || "",
        s.code || "",
        s.name || "",
        s.color || "",
        s.type || "",
        ...(Object.values(s.attributes || {}) as string[]),
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
    list.sort((a, b) => {
      let av = "", bv = "";
      if (sortBy === "po") { av = String(a.poNumber || ""); bv = String(b.poNumber || ""); }
      else if (sortBy === "code") { av = String(a.code || ""); bv = String(b.code || ""); }
      else { av = String(a.name || ""); bv = String(b.name || ""); }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [skus, search, sortBy, sortDir]);

  /****************************************************
   * [LMK-19] SUBCOMPONENT — LAYOUT EDITOR (REORDER + SAVE)
   ****************************************************/
  function LayoutEditor() {
    const [localKeys, setLocalKeys] = useState<string[]>(attrKeys);
    const [newKey, setNewKey] = useState("");

    useEffect(() => setLocalKeys(attrKeys), [attrKeys]);

    function addKey() {
      const k = newKey.trim();
      if (!k || localKeys.includes(k)) return;
      setLocalKeys([...localKeys, k]);
      setNewKey("");
    }
    function removeKey(k: string) {
      setLocalKeys(localKeys.filter((x) => x !== k));
    }
    function move(k: string, dir: -1 | 1) {
      const idx = localKeys.indexOf(k);
      if (idx < 0) return;
      const swap = idx + dir;
      if (swap < 0 || swap >= localKeys.length) return;
      const next = [...localKeys];
      [next[idx], next[swap]] = [next[swap], next[idx]];
      setLocalKeys(next);
    }
    async function save() {
      await saveLayout(localKeys);
      setForm((f: any) => {
        const next: Record<string, string> = { ...(f.attrs || {}) };
        for (const k of localKeys) if (!(k in next)) next[k] = "";
        return { ...f, attrs: next };
      });
    }

    return (
      <div className="rounded-lg border border-gray-200 dark:border-neutral-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Custom attribute fields</div>
        </div>

        <div className="flex items-center gap-2">
          <input
            className="flex-1 rounded border px-3 py-2"
            placeholder="Attribute name (e.g., Pantone, Finish, Size)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <button
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700"
            onClick={addKey}
            type="button"
          >
            Add
          </button>
          <button
            className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm hover:bg-indigo-700"
            onClick={save}
            type="button"
          >
            Save layout
          </button>
        </div>

        {localKeys.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {localKeys.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
              >
                <button title="Move up" onClick={() => move(k, -1)} className="opacity-60 hover:opacity-100">↑</button>
                <button title="Move down" onClick={() => move(k, +1)} className="opacity-60 hover:opacity-100">↓</button>
                {k}
                <button
                  onClick={() => removeKey(k)}
                  className="text-gray-500 hover:text-red-600"
                  title="Remove from layout (columns with historical data remain visible)"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500">
          Saved layout applies to this project and pre-fills new SKU forms. Columns with
          historical data stay visible until all values are empty.
        </div>
      </div>
    );
  }

  /****************************************************
   * [LMK-20] SUBCOMPONENT — PO SIDEPANEL (VIEW/REPLACE/DELETE)
   ****************************************************/
  function PoPanel() {
    const [uploadFor, setUploadFor] = useState<string>("");
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);

    async function replacePo() {
      if (!uploadFor || !file) return;
      try {
        setBusy(true);
        await uploadPoIfNeeded(uploadFor, file);
        setUploadFor("");
        setFile(null);
        showToastOk(`PO “${uploadFor}” file updated.`);
      } catch (e: any) {
        showToastErr(e?.message || "Replace failed");
      } finally {
        setBusy(false);
      }
    }

    async function deletePo(poNumber: string) {
      if (!confirm(`Delete PO "${poNumber}"? (SKUs remain but will need a new PO if edited)`)) return;
      try {
        setBusy(true);
        const r = await fetch(`${API_BASE}/api/projects/${project.id}/po/${encodeURIComponent(poNumber)}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!r.ok) throw new Error((await r.text()) || "Delete failed");
        setPoList((list) => list.filter((p) => p.poNumber !== poNumber));
        showToastOk(`PO “${poNumber}” deleted.`);
      } catch (e: any) {
        showToastErr(e?.message || "Delete failed");
      } finally {
        setBusy(false);
      }
    }

    return (
      <div className="rounded-lg border border-gray-200 dark:border-neutral-800 p-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Purchase Orders</div>
          {poLoading && <div className="text-xs text-gray-500">Loading…</div>}
        </div>
        <div className="mt-2 space-y-2 max-h-60 overflow-auto">
          {poList.length === 0 ? (
            <div className="text-sm text-gray-500">No POs yet.</div>
          ) : (
            poList.map((po) => (
              <div key={po.poNumber} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{po.poNumber}</span>
                  {po.url ? (
                    <a className="underline text-indigo-600" href={po.url} target="_blank" rel="noreferrer">
                      view
                    </a>
                  ) : (
                    <span className="text-gray-400">no file</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50 dark:border-neutral-700"
                    onClick={() => setUploadFor(po.poNumber)}
                  >
                    Replace file
                  </button>
                  <button
                    className="rounded border px-2 py-0.5 text-xs hover:bg-red-50 text-red-600 border-red-300"
                    onClick={() => deletePo(po.poNumber)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {uploadFor && (
          <div className="mt-3 rounded-lg border p-2">
            <div className="text-xs mb-1">
              Replace PO: <b>{uploadFor}</b>
            </div>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="mt-2 flex gap-2">
              <button
                disabled={busy || !file}
                onClick={replacePo}
                className="rounded bg-indigo-600 text-white px-3 py-1 text-xs disabled:opacity-60"
              >
                {busy ? "Uploading…" : "Upload"}
              </button>
              <button
                onClick={() => { setUploadFor(""); setFile(null); }}
                className="rounded border px-3 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500">
          Replacing or deleting a PO only affects the file; SKUs referencing a deleted PO
          must attach a new PO on edit.
        </div>
      </div>
    );
  }

 /****************************************************
 * [LMK-21] RENDER
 ****************************************************/
return (
  <div className="space-y-4">
    {/* Header + Filters */}
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">SKUs for {project.name}</h2>
      <div className="flex items-center gap-2">
        <input
          className="rounded border px-3 py-1.5 text-sm"
          placeholder="Search code / name / PO / attributes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-500">Sort:</span>
          <button
            className={`rounded border px-2 py-1 ${sortBy === "po" ? "bg-gray-100" : ""}`}
            onClick={() => toggleSort("po")}
            title="Sort by PO"
          >
            PO {sortBy === "po" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </button>
          <button
            className={`rounded border px-2 py-1 ${sortBy === "code" ? "bg-gray-100" : ""}`}
            onClick={() => toggleSort("code")}
            title="Sort by Code"
          >
            Code {sortBy === "code" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </button>
          <button
            className={`rounded border px-2 py-1 ${sortBy === "name" ? "bg-gray-100" : ""}`}
            onClick={() => toggleSort("name")}
            title="Sort by Name"
          >
            Name {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
          </button>
        </div>
        <button
          className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm hover:bg-indigo-700"
          onClick={openCreateModal}
        >
          Add SKU
        </button>
      </div>
    </div>

    {/* Error Banner */}
    {err && (
      <div className="rounded-md border border-red-300 bg-red-50 text-red-700 p-3 text-sm">
        {err}
      </div>
    )}

    {/* Layout + PO Panel */}
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        {/* Table */}
        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-neutral-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
            <thead className="bg-gray-50 dark:bg-neutral-900/60">
              <tr>
                {[
                  "PO No.",
                  "Code",
                  "Name",
                  "Color",
                  "Type",
                  "Qty",
                  ...attrColumns,
                  "Image",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-left text-xs font-medium text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td
                    className="px-4 py-3 text-sm text-gray-500"
                    colSpan={6 + attrColumns.length + 2}
                  >
                    Loading…
                  </td>
                </tr>
              ) : filteredSorted.length === 0 ? (
                <tr>
                  <td
                    className="px-4 py-3 text-sm text-gray-500"
                    colSpan={6 + attrColumns.length + 2}
                  >
                    No SKUs.
                  </td>
                </tr>
              ) : (
                filteredSorted.map((sku) => (
                  <tr key={sku.id}>
                    <td className="px-4 py-2 text-sm">{sku.poNumber || "—"}</td>
                    <td className="px-4 py-2 text-sm font-medium">{sku.code}</td>
                    <td className="px-4 py-2 text-sm">{sku.name || "—"}</td>
                    <td className="px-4 py-2 text-sm">{sku.color || "—"}</td>
                    <td className="px-4 py-2 text-sm">{sku.type || "—"}</td>
                    <td className="px-4 py-2 text-sm">{sku.orderQty ?? "—"}</td>

                    {attrColumns.map((k) => (
                      <td key={k} className="px-4 py-2 text-sm">
                        {sku.attributes?.[k] ? String(sku.attributes[k]) : "—"}
                      </td>
                    ))}

                    <td className="px-4 py-2 text-sm">
                      {sku.imageUrl ? (
                        <img
                          src={sku.imageUrl}
                          alt=""
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700"
                          onClick={() => openEditModal(sku)}
                          title="Edit SKU"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-red-50 text-red-600 border-red-300"
                          onClick={() => askDeleteSku(sku)}
                          title="Delete SKU"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Sidebar — LayoutEditor removed; only PO panel stays */}
      <div className="col-span-1 space-y-4">
        <PoPanel />
      </div>
    </div>

    {/* Add/Edit SKU Modal */}
    {open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
          {/* Modal header */}
          <div className="flex items-start justify-between p-6 pb-4 border-b">
            <h3 className="text-lg font-semibold">
              {mode === "create" ? "Add SKU" : `Edit SKU — ${editingSku?.code}`}
            </h3>
            <button
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Close
            </button>
          </div>

          {/* Modal body - scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-4">
            {/* PO + Upload */}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className="block text-sm text-gray-600 mb-1">
                  PO number <span className="text-red-600">*</span>
                </label>
                <input
                  className="w-full rounded border px-3 py-2"
                  placeholder="Enter PO number"
                  value={form.poNumber}
                  onChange={(e) => onChange("poNumber", e.target.value)}
                  onBlur={(e) => checkPoExists(e.target.value)}
                />
                {poProbe.checking && (
                  <div className="mt-1 text-xs text-gray-500">Checking PO…</div>
                )}
                {poProbe.exists === true && (
                  <div className="mt-1 text-xs text-green-600">
                    PO found
                    {poProbe.url ? (
                      <>
                        {" "}
                        —{" "}
                        <a
                          className="underline"
                          href={poProbe.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          view
                        </a>
                        .
                      </>
                    ) : (
                      "."
                    )}
                  </div>
                )}
                {poProbe.exists === false && (
                  <div className="mt-1 text-xs text-amber-700">
                    PO not found — upload PDF below.
                  </div>
                )}
              </div>
              <div className="col-span-1">
                <label className="block text-sm text-gray-600 mb-1">
                  Upload PO (PDF)
                  {poProbe.exists === false ? (
                    <span className="text-red-600"> *</span>
                  ) : (
                    " (optional)"
                  )}
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) =>
                    onChange("poPdfFile", e.target.files?.[0] || null)
                  }
                />
              </div>
            </div>

            {/* Core fields */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                SKU code <span className="text-red-600">*</span>
              </label>
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="Unique code"
                value={form.code}
                onChange={(e) => onChange("code", e.target.value)}
                disabled={mode === "edit"}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                className="w-full rounded border px-3 py-2"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Color</label>
              <input
                className="w-full rounded border px-3 py-2"
                value={form.color}
                onChange={(e) => onChange("color", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Type</label>
              <input
                className="w-full rounded border px-3 py-2"
                value={form.type}
                onChange={(e) => onChange("type", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Order Qty
              </label>
              <input
                className="w-full rounded border px-3 py-2"
                inputMode="numeric"
                value={form.orderQty}
                onChange={(e) => onChange("orderQty", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                SKU Image (preview only)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  onChange("imageFile", e.target.files?.[0] || null)
                }
              />
            </div>

            {/* Layout editor (INSIDE the modal) */}
            <div className="col-span-2">
              <LayoutEditor />
            </div>

            {/* Dynamic custom attributes */}
            {attrKeys.length > 0 && (
              <div className="col-span-2">
                <div className="text-sm font-medium mb-2">
                  Custom attributes
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {attrKeys.map((k) => (
                    <div key={k}>
                      <label className="block text-xs text-gray-600 mb-1">
                        {k}
                      </label>
                      <input
                        className="w-full rounded border px-3 py-2"
                        placeholder={k}
                        value={form.attrs[k] || ""}
                        onChange={(e) => onAttrChange(k, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inline modal error */}
          {modalError && (
            <div className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
              {modalError}
            </div>
          )}
          </div>

          {/* Modal footer - fixed at bottom */}
          <div className="p-6 pt-4 border-t flex justify-end gap-2">
            <button
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm hover:bg-indigo-700 disabled:opacity-60"
              onClick={submitCreateOrEdit}
              disabled={saving}
            >
              {saving ? "Saving…" : mode === "create" ? "Save SKU" : "Update SKU"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Fancy Delete Confirm Modal */}
    {confirmOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
          <h3 className="text-lg font-semibold mb-2">Delete SKU</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to delete{" "}
            <span className="font-medium">{skuPendingDelete?.code}</span>? This
            action cannot be undone.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700"
              onClick={cancelDelete}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm hover:bg-red-700 disabled:opacity-60"
              onClick={performDeleteSku}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)};
