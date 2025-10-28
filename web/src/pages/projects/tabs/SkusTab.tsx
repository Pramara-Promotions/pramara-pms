// web/src/pages/projects/tabs/SkusTab.tsx
// @ts-nocheck

/****************************************************
 * [LMK-01] IMPORTS
 ****************************************************/
import React, { useEffect, useMemo, useRef, useState } from "react";
import ApproveExtractionModal from "../../../features/docintel/ApproveExtractionModal";
import { DOC_INTELLIGENCE_ENABLED } from "../../../config/flags";
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
const API_BASE = ""; // Use Vite proxy (it's working!)

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
  if (!project) return <div className="text-sm text-gray-500">Loading projectΓÇª</div>;

  /****************************************************
   * [LMK-05] STATE ΓÇô TABLE + LAYOUT MEMORY
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
   * [LMK-06] STATE ΓÇô FILTERS / SORT
   ****************************************************/
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"po" | "code" | "name">("po");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  /****************************************************
   * [LMK-07] STATE ΓÇô MODAL + FORM (CREATE/EDIT)
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

  // PO PDF preview + multi-PO handling
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detectedPos, setDetectedPos] = useState<string[]>([]);
  const [lastUploadedPoKey, setLastUploadedPoKey] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      try { previewUrl && previewUrl.startsWith('blob:') && URL.revokeObjectURL(previewUrl); } catch {}
    };
  }, [previewUrl]);

  /****************************************************
 * [LMK-07A] STATE ΓÇô DELETE CONFIRM
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
   * [LMK-10] HELPERS ΓÇö FORM + SORT
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
   * [LMK-13] OPEN MODAL ΓÇö CREATE / EDIT
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
   * [LMK-14] UPLOAD ΓÇö PO PDF (PRESIGN + CONFIRM; LEGACY FALLBACK)
   ****************************************************/
  async function uploadPoIfNeeded(poNumber: string, poPdfFile: File | null): Promise<{ key?: string; fields?: any[] } | void> {
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
        setLastUploadedPoKey(presign.key || null);

        // refresh PO list
        try {
          const pos = await fetchJson(`${API_BASE}/api/projects/${project.id}/pos`, {
            credentials: "include",
          });
          setPoList(Array.isArray(pos) ? pos : []);
        } catch { /* no-op */ }

        // Trigger extraction only if feature enabled
        if (DOC_INTELLIGENCE_ENABLED) {
          try {
            const exRes = await fetch(`/api/doc-intelligence/extract`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                entity: 'PurchaseOrder',
                entityId: String(poNumber),
                filename: poPdfFile.name,
                mimeType: poPdfFile.type || 'application/pdf',
                sizeBytes: poPdfFile.size || 0,
                storageKey: presign.key,
                meta: { projectId: project.id, poNumber }
              })
            });
            if (exRes.ok) {
              const data = await exRes.json();
              if (Array.isArray(data?.result?.fields) && data.result.fields.length) {
                setDiModal({ job: data.job, fields: data.result.fields, fallbackUrl: previewUrl || poProbe.url });
                // Opportunistically pre-fill form fields
                applyExtractedFieldsToForm(data.result.fields);
                return { key: presign.key, fields: data.result.fields };
              }
            }
          } catch {}
        }
        return { key: presign.key };
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
    // Best-effort DI disabled by default
    if (DOC_INTELLIGENCE_ENABLED) {
      try {
        await fetch(`/api/doc-intelligence/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            entity: 'PurchaseOrder',
            entityId: String(poNumber),
            filename: poPdfFile?.name || `po-${poNumber}.pdf`,
            mimeType: poPdfFile?.type || 'application/pdf',
            sizeBytes: poPdfFile?.size || 0,
            meta: { projectId: project.id, poNumber },
          })
        });
      } catch {}
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

  // Doc Intelligence modal state for PO upload
  const [diModal, setDiModal] = useState<any | null>(null);

  // Map DI fields to our form model conservatively (only fill empty fields)
  function applyExtractedFieldsToForm(fields: Array<{ name: string; value: any }>) {
    console.log('[DI] applyExtractedFieldsToForm called with:', fields);
    if (!Array.isArray(fields) || fields.length === 0) {
      console.warn('[DI] No fields to apply');
      return;
    }
    // collect multi-POs
    const poValues = Array.from(new Set(fields.filter(f => f.name === 'poNumber').map(f => String(f.value || '').trim()).filter(Boolean)));
    console.log('[DI] Found PO values:', poValues);
    if (poValues.length) setDetectedPos(poValues);

    setForm((prev: any) => {
      const next = { ...prev };
      const get = (n: string) => fields.find((f) => f.name === n)?.value;
      console.log('[DI] Current form state:', prev);
      
      // PO number
      if (!String(next.poNumber || '').trim() && get('poNumber')) {
        next.poNumber = String(get('poNumber'));
        console.log('[DI] Set poNumber:', next.poNumber);
      }
      // Order quantity
      const qty = get('quantity');
      if (!String(next.orderQty || '').trim() && qty != null) {
        next.orderQty = String(qty);
        console.log('[DI] Set orderQty:', next.orderQty);
      }
      // Color / Pantone
      const pantone = get('pantoneCode');
      if (!String(next.color || '').trim() && pantone) {
        next.color = String(pantone);
        console.log('[DI] Set color from pantone:', next.color);
      }
      // SKU / Part / Item code
      const skuLike = get('skuCode') || get('itemCode') || get('partNumber');
      if (!String(next.code || '').trim()) {
        if (skuLike) {
          next.code = String(skuLike).replace(/\s+/g, '-').toUpperCase();
          console.log('[DI] Set code from extracted:', next.code);
        } else if (next.poNumber) {
          next.code = suggestSkuCode(String(next.poNumber));
          console.log('[DI] Set suggested code:', next.code);
        }
      }
      // Add extra custom attributes from unknown fields
      const known = new Set(['poNumber','quantity','pantoneCode','date','contactEmail','contactPhone','skuCode','itemCode','partNumber']);
      const extras: Record<string,string> = {};
      for (const f of fields) {
        const key = String(f.name || '').trim();
        if (!key || known.has(key)) continue;
        const val = String(f.value ?? '').trim();
        if (!val) continue;
        // Don't overwrite if user already typed
        if (!String((next.attrs || {})[key] || '').trim()) extras[key] = val;
      }
      console.log('[DI] Custom attributes to add:', extras);
      next.attrs = { ...(next.attrs || {}), ...extras };
      // Also add these to layout keys for future forms
      const newKeys = Object.keys(extras).filter(k => !attrKeys.includes(k));
      if (newKeys.length) {
        const merged = [...attrKeys, ...newKeys];
        setAttrKeys(merged);
        console.log('[DI] Added new layout keys:', newKeys);
        // best effort persist
        saveLayout(merged).catch(()=>{});
      }
      console.log('[DI] Updated form state:', next);
      return next;
    });
  }

  function suggestSkuCode(po: string) {
    const base = String(po).replace(/\s+/g, '').toUpperCase();
    // find next serial for this PO
    const existing = skus.filter(s => String(s.poNumber || '') === po).map(s => s.code);
    let n = 1;
    while (existing.includes(`${base}-${String(n).padStart(3,'0')}`)) n++;
    return `${base}-${String(n).padStart(3,'0')}`;
  }

  async function extractInlineFromFile(file: File) {
    if (!DOC_INTELLIGENCE_ENABLED) {
      console.log('[DI] Disabled: skipping inline extraction');
      return;
    }
    try {
      console.log('[DI] Starting inline extraction for:', file.name, file.size, 'bytes');
      
      // For files larger than 500KB, skip inline extraction and use presigned upload instead
      if (file.size > 500000) {
        console.log('[DI] File too large for inline extraction, will upload with presigned URL');
        showToastErr('File too large for instant preview. Please enter PO number first.');
        return;
      }
      
      const ab = await file.arrayBuffer();
      
      // Use chunked base64 encoding to avoid stack overflow
      const uint8Array = new Uint8Array(ab);
      const chunkSize = 8192;
      let base64 = '';
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        base64 += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const b64 = btoa(base64);
      console.log('[DI] Base64 encoded, length:', b64.length);
      
      const res = await fetch(`/api/doc-intelligence/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          entity: 'PurchaseOrder',
          entityId: null,
          filename: file.name,
          mimeType: file.type || 'application/pdf',
          sizeBytes: file.size || 0,
          fileBase64: b64,
          meta: { projectId: project.id }
        })
      });
      
      console.log('[DI] Response status:', res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error('[DI] Extraction failed:', errText);
        showToastErr(`Extraction failed: ${res.status}`);
        return;
      }
      
      const data = await res.json();
      console.log('[DI] Extraction result:', data);
      
      if (Array.isArray(data?.result?.fields)) {
        console.log('[DI] Fields extracted:', data.result.fields.length);
        setDiModal({ job: data.job, fields: data.result.fields, fallbackUrl: previewUrl || poProbe.url });
        applyExtractedFieldsToForm(data.result.fields);
        showToastOk(`Extracted ${data.result.fields.length} fields from PDF`);
      } else {
        console.warn('[DI] No fields array in response');
        showToastErr('No data extracted from PDF');
      }
    } catch (err) {
      console.error('[DI] Inline extraction error:', err);
      showToastErr('Failed to extract data from PDF');
    }
  }

  /****************************************************
   * [LMK-15] UPLOAD ΓÇö SKU IMAGE (OPTIONAL; PREVIEW ONLY)
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

      console.log('🚀 [SKU FRONTEND] About to POST /api/project-skus');
      console.log('🚀 [SKU FRONTEND] Payload:', payload);
      console.log('🚀 [SKU FRONTEND] API_BASE:', API_BASE);

      if (mode === "create") {
        const url = `${API_BASE}/api/project-skus`;
        console.log('🚀 [SKU FRONTEND] Full URL:', url);
        const res = await fetch(url, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        console.log('🚀 [SKU FRONTEND] Response status:', res.status);
        if (!res.ok) {
          const js = await res.json().catch(() => ({}));
          console.log('🚀 [SKU FRONTEND] Error response:', js);
          if (js?.needsPO) { setModalError("PO not found. Please upload the PO PDF."); return; }
          throw new Error(js?.error || "Create SKU failed");
        }
        const sku = await res.json();
        console.log('🚀 [SKU FRONTEND] Created SKU - Full object:', sku);
        console.log('🚀 [SKU FRONTEND] SKU id:', sku.id, 'code:', sku.code, 'name:', sku.name);
        setSkus((rows) => [...rows, sku]);
        setLastPo(po);
        setOpen(false);
        showToastOk(`SKU "${sku.code}" created.`);
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
        showToastOk(`SKU ΓÇ£${sku.code}ΓÇ¥ updated.`);
      }
    } catch (e: any) {
      setModalError(e?.message || "Save failed");
      showToastErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

/****************************************************
 * [LMK-17] ACTION ΓÇö DELETE SKU
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
    showToastOk(`SKU ΓÇ£${skuPendingDelete.code}ΓÇ¥ deleted.`);
    setConfirmOpen(false);
    setSkuPendingDelete(null);
  } catch (e: any) {
    showToastErr(e?.message || "Delete failed");
  } finally {
    setDeleting(false);
  }
}
  /****************************************************
   * [LMK-18] TABLE ΓÇö attrColumns + FILTERED/SORTED LIST
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
   * [LMK-19] SUBCOMPONENT ΓÇö LAYOUT EDITOR (REORDER + SAVE)
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

        <div className="flex items-center gap-2 flex-wrap">
          <input
            className="w-72 md:w-96 rounded border px-3 py-2"
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
            {localKeys.map((k, idx) => (
              <span
                key={`custom-attr-key-${idx}-${k}`}
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
                  Γ£ò
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
   * [LMK-20] SUBCOMPONENT ΓÇö PO SIDEPANEL (VIEW/REPLACE/DELETE)
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
        showToastOk(`PO ΓÇ£${uploadFor}ΓÇ¥ file updated.`);
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
        showToastOk(`PO ΓÇ£${poNumber}ΓÇ¥ deleted.`);
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
          {poLoading && <div className="text-xs text-gray-500">LoadingΓÇª</div>}
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
                {busy ? "UploadingΓÇª" : "Upload"}
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
  async function attachAllDetectedPos() {
    if (!lastUploadedPoKey || detectedPos.length <= 1) return;
    const primary = String(form.poNumber || '').trim();
    const others = detectedPos.filter(p => p && p !== primary);
    if (others.length === 0) return;
    try {
      setSaving(true);
      // confirm additional POs with same uploaded file key
      for (const po of others) {
        await fetchJson(`${API_BASE}/api/projects/${project.id}/po/confirm`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poNumber: po, key: lastUploadedPoKey })
        });
      }
      // refresh list
      try {
        const pos = await fetchJson(`${API_BASE}/api/projects/${project.id}/pos`, { credentials: 'include' });
        setPoList(Array.isArray(pos) ? pos : []);
      } catch {}
      showToastOk(`Attached ${others.length} additional PO${others.length>1?'s':''} to this project.`);
    } catch (e) {
      console.warn('Attach extra POs failed', e);
      showToastErr('Failed to attach additional POs');
    } finally {
      setSaving(false);
    }
  }

  return ( 
  <div className="space-y-4">
    {/* Header + Filters */}
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">SKUs for {project.name}</h2>
      <div className="flex items-center gap-2">
        <input
          className="rounded border px-3 py-1.5 text-sm"
          placeholder="Search code / name / PO / attributesΓÇª"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-1 text-xs">
          {diModal && (
            <ApproveExtractionModal
              job={diModal.job}
              fields={diModal.fields}
              fallbackUrl={diModal.fallbackUrl}
              onClose={() => setDiModal(null)}
              onApproved={() => setDiModal(null)}
            />
          )}
          <span className="text-gray-500">Sort:</span>
          <button
            className={`rounded border px-2 py-1 ${sortBy === "po" ? "bg-gray-100" : ""}`}
            onClick={() => toggleSort("po")}
            title="Sort by PO"
          >
            PO {sortBy === "po" ? (sortDir === "asc" ? "Γåæ" : "Γåô") : ""}
          </button>
          <button
            className={`rounded border px-2 py-1 ${sortBy === "code" ? "bg-gray-100" : ""}`}
            onClick={() => toggleSort("code")}
            title="Sort by Code"
          >
            Code {sortBy === "code" ? (sortDir === "asc" ? "Γåæ" : "Γåô") : ""}
          </button>
          <button
            className={`rounded border px-2 py-1 ${sortBy === "name" ? "bg-gray-100" : ""}`}
            onClick={() => toggleSort("name")}
            title="Sort by Name"
          >
            Name {sortBy === "name" ? (sortDir === "asc" ? "Γåæ" : "Γåô") : ""}
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
                ].map((h, idx) => (
                  <th
                    key={`table-header-${idx}-${h}`}
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
                    LoadingΓÇª
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

                    {attrColumns.map((k, idx) => (
                      <td key={`table-cell-attr-${sku.id}-${idx}-${k}`} className="px-4 py-2 text-sm">
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
                        "ΓÇö"
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

      {/* Right Sidebar ΓÇö LayoutEditor removed; only PO panel stays */}
      <div className="col-span-1 space-y-4">
        <PoPanel />
      </div>
    </div>

    {/* Add/Edit SKU Modal */}
    {open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
        <div className="w-full max-w-6xl max-h-[95vh] flex flex-col rounded-2xl bg-white shadow-xl dark:bg-neutral-900">
          {/* Modal header */}
          <div className="flex items-start justify-between p-4 sm:p-6 pb-3 border-b">
            <h3 className="text-base sm:text-lg font-semibold">
              {mode === "create" ? "Add SKU" : `Edit SKU ΓÇö ${editingSku?.code}`}
            </h3>
            <button
              className="rounded-lg border px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-gray-50 dark:border-neutral-700"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Close
            </button>
          </div>

          {/* Modal body - scrollable with 2-column layout: form on left, preview on right */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            
            {/* LEFT COLUMN: Form fields */}
            <div className="space-y-4">
              {/* PO + Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    PO number <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="Enter PO number"
                    value={form.poNumber}
                    onChange={(e) => onChange("poNumber", e.target.value)}
                    onBlur={(e) => checkPoExists(e.target.value)}
                  />
                  {poProbe.checking && (
                    <div className="mt-1 text-xs text-gray-500">Checking POΓÇª</div>
                  )}
                  {poProbe.exists === true && (
                    <div className="mt-1 text-xs text-green-600">
                      PO found
                      {poProbe.url ? (
                        <>
                          {" "}
                          ΓÇö{" "}
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
                      PO not found ΓÇö upload PDF.
                    </div>
                  )}
                    {DOC_INTELLIGENCE_ENABLED && !form.poNumber?.trim() && form.poPdfFile && form.poPdfFile.size > 500000 && (
                      <div className="mt-1 text-xs text-blue-600">
                        ≡ƒÆí Enter PO number to enable auto-extraction
                      </div>
                    )}
                </div>
                <div>
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
                    className="w-full text-sm"
                    onChange={async (e) => {
                      const file = e.target.files?.[0] || null;
                      onChange("poPdfFile", file);
                      // show local preview immediately
                      if (file) {
                        try { previewUrl && URL.revokeObjectURL(previewUrl); } catch {}
                        setPreviewUrl(URL.createObjectURL(file));
                      }
                      const po = String((form.poNumber || '').trim());
                      if (file) {
                        if (po) {
                          // Upload (DI disabled by default)
                          try { await uploadPoIfNeeded(po, file); } catch (err) { console.error('Upload failed:', err); }
                        } else if (DOC_INTELLIGENCE_ENABLED) {
                          // Check file size - for large files, prompt user to enter PO first
                          if (file.size > 500000) {
                            showToastErr('Large PDF detected. Please enter PO number first, then extraction will run automatically.');
                          } else {
                            // Small file: run inline extraction first to auto-fill, then attach
                            await extractInlineFromFile(file);
                            const detectedPo = String((form.poNumber || '').trim());
                            if (detectedPo) {
                              try { await uploadPoIfNeeded(detectedPo, file); } catch (err) { console.error('Upload after extract failed:', err); }
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* If multiple POs detected in the PDF */}
              {detectedPos.length > 1 && (
                <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                  Detected multiple PO numbers: {detectedPos.join(', ')}.
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded bg-amber-600 text-white px-3 py-1 text-xs disabled:opacity-60"
                      onClick={attachAllDetectedPos}
                      disabled={!lastUploadedPoKey || saving}
                    >{saving ? 'AttachingΓÇª' : 'Attach all to project'}</button>
                    {!lastUploadedPoKey && (
                      <span className="text-xs text-amber-700">Upload must complete first.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Core fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    SKU code <span className="text-red-600">*</span>
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="Unique code"
                    value={form.code}
                    onChange={(e) => onChange("code", e.target.value)}
                    disabled={mode === "edit"}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name</label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={form.name}
                    onChange={(e) => onChange("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Color</label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={form.color}
                    onChange={(e) => onChange("color", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Type</label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
                    value={form.type}
                    onChange={(e) => onChange("type", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Order Qty
                  </label>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm"
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
                    className="w-full text-sm"
                    onChange={(e) =>
                      onChange("imageFile", e.target.files?.[0] || null)
                    }
                  />
                </div>
              </div>

              {/* Dynamic custom attributes */}
              {attrKeys.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">
                    Custom attributes
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attrKeys.map((k, idx) => (
                      <div key={`modal-form-attr-${idx}-${k}`}>
                        <label className="block text-xs text-gray-600 mb-1">
                          {k}
                        </label>
                        <input
                          className="w-full rounded border px-3 py-2 text-sm"
                          placeholder={k}
                          value={form.attrs[k] || ""}
                          onChange={(e) => onAttrChange(k, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Layout editor (always on the left column) */}
              <div>
                <LayoutEditor />
              </div>
            </div>

            {/* RIGHT COLUMN: PDF Preview (sticky on desktop) */}
            <div className="space-y-4 md:sticky md:top-0 md:self-start">
              <div>
                <label className="block text-sm text-gray-600 mb-2 font-medium">PO Preview</label>
                <div className="border rounded overflow-hidden bg-gray-50" style={{ height: 'calc(95vh - 200px)', minHeight: '400px' }}>
                  {previewUrl || poProbe.url ? (
                    <iframe src={previewUrl || poProbe.url || ''} className="w-full h-full" title="PO Preview" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-gray-500">
                      No preview available
                      <br />
                      <span className="text-xs">Upload a PDF to see preview</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Layout editor moved to left column; remove duplicate here */}
            </div>
          </div>

          {/* Inline modal error */}
          {modalError && (
            <div className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
              {modalError}
            </div>
          )}
          </div>

          {/* Modal footer - fixed at bottom */}
          <div className="p-4 sm:p-6 pt-3 border-t flex justify-end gap-2">
            <button
              className="rounded-lg border px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-gray-50 dark:border-neutral-700"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-lg bg-indigo-600 text-white px-2 sm:px-3 py-1.5 text-xs sm:text-sm hover:bg-indigo-700 disabled:opacity-60"
              onClick={submitCreateOrEdit}
              disabled={saving}
            >
              {saving ? "SavingΓÇª" : mode === "create" ? "Save SKU" : "Update SKU"}
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
              {deleting ? "DeletingΓÇª" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)};
