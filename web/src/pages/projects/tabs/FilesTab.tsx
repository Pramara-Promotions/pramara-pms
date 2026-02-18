// @ts-nocheck
import React, { useMemo, useRef, useState, useEffect } from "react";
import { createApproval } from "../../../lib/services/approvals";
import { useProjectDocuments } from "../hooks/useProjectDocuments";
import { useStations } from "../hooks/useStations";
import { useProjectContext } from "../ProjectContext";

export default function FilesTab() {
  const project = useProjectContext();
  if (!project) return <div className="text-sm text-gray-500">Loading project…</div>;
  const projectId = useMemo(() => Number(project?.id), [project?.id]);
  const { documents, loading, error, reload, updateDocument, deleteDocument } = useProjectDocuments(projectId);
  const [complianceDocs, setComplianceDocs] = useState<any[]>([]);
  const [showComplianceDocs, setShowComplianceDocs] = useState(false);
  const [aggregatedFiles, setAggregatedFiles] = useState<any[]>([]);
  const [showAggregated, setShowAggregated] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [aggregatedLoading, setAggregatedLoading] = useState(false);
  const { stations } = useStations(projectId);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDoc, setHistoryDoc] = useState(null);
  const [history, setHistory] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTargets, setShareTargets] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalDoc, setApprovalDoc] = useState<any>(null);
  const [approvalForm, setApprovalForm] = useState({
    title: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    dueDate: '',
    expectedDate: '',
    priority: 'medium',
    notes: ''
  });

  // Enhanced delete: ask if user wants to delete all versions or just this one
  const [deleteMode, setDeleteMode] = useState<'single' | 'all'>('single');
  const [deleteHasChain, setDeleteHasChain] = useState(false);
  async function confirmDelete(doc) {
    setDeleteDoc(doc);
    setDeleteMode('single');
    // Check if this doc is a root with revisions
    let hasChain = false;
    if (!doc.parentId) {
      try {
        const res = await fetch(`/api/documents/${doc.id}/revisions`, { credentials: 'include' });
        if (res.ok) {
          const revs = await res.json();
          hasChain = Array.isArray(revs) && revs.length > 1;
        }
      } catch { }
    }
    setDeleteHasChain(hasChain);
    setShowDeleteModal(true);
  }

  async function handleDelete() {
    if (!deleteDoc) return;
    if (deleteMode === 'all') {
      await fetch(`/api/documents/${deleteDoc.id}/all`, { method: 'DELETE', credentials: 'include' });
    } else {
      await deleteDocument(deleteDoc.id);
    }
    setShowDeleteModal(false);
    setDeleteDoc(null);
    setDeleteMode('single');
    setDeleteHasChain(false);
    await reload();
  }

  function openShareModal(targets) {
    setShareTargets(targets || []);
    setShowShareModal(true);
  }

  function closeShareModal() {
    setShowShareModal(false);
    setShareTargets([]);
  }

  async function handleDeactivate(docId) {
    try {
      const res = await fetch(`/api/documents/${docId}/deactivate`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        console.error('Deactivate failed:', await res.text());
        alert('Failed to deactivate document');
        return;
      }
      await reload();
    } catch (err) {
      console.error('Error deactivating:', err);
      alert('Failed to deactivate document');
    }
  }

  async function handleActivate(docId) {
    try {
      const res = await fetch(`/api/documents/${docId}/activate`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        console.error('Activate failed:', await res.text());
        alert('Failed to activate document');
        return;
      }
      await reload();
      // If History modal is open, refresh it too
      if (showHistoryModal && historyDoc) {
        try {
          const res2 = await fetch(`/api/documents/${historyDoc.id}/revisions`, { credentials: 'include' });
          if (res2.ok) {
            const js = await res2.json();
            setHistory(js);
          }
        } catch { }
      }
    } catch (err) {
      console.error('Error activating:', err);
      alert('Failed to activate document');
    }
  }

  // Load compliance documents when toggled on
  useEffect(() => {
    if (!showComplianceDocs) return;
    (async () => {
      try {
        const res = await fetch(`/api/compliance/documents/by-project?projectId=${projectId}`, { credentials: 'include' });
        if (res.ok) {
          const js = await res.json();
          setComplianceDocs(Array.isArray(js) ? js : []);
        }
      } catch { }
    })();
  }, [showComplianceDocs, projectId]);

  // Load aggregated files when toggled on
  useEffect(() => {
    if (!showAggregated) return;
    (async () => {
      try {
        setAggregatedLoading(true);
        const res = await fetch(`/api/documents/by-project/${projectId}?module=${moduleFilter}`, { credentials: 'include' });
        if (res.ok) {
          const js = await res.json();
          setAggregatedFiles(Array.isArray(js) ? js : []);
        }
      } catch {
        setAggregatedFiles([]);
      } finally {
        setAggregatedLoading(false);
      }
    })();
  }, [showAggregated, projectId, moduleFilter]);

  async function openHistory(doc) {
    setHistoryDoc(doc);
    setShowHistoryModal(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/revisions`, { credentials: 'include' });
      if (!res.ok) {
        console.error('Failed to load revisions:', await res.text());
        setHistory([]);
        return;
      }
      const js = await res.json();
      setHistory(js);
    } catch (err) {
      console.error('Error loading revisions:', err);
      setHistory([]);
    }
  }

  function openEdit(doc) {
    setEditDoc(doc);
    setShowEditModal(true);
  }

  function openApproval(doc) {
    setApprovalDoc(doc);
    setApprovalForm((prev) => ({
      ...prev,
      title: doc?.title || 'Approval Request',
    }));
    setShowApprovalModal(true);
  }

  async function handleRevise(doc, values) {
    await fetch(`/api/documents/${doc.id}/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(values),
    });
    setShowEditModal(false);
    await reload();
  }

  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    kind: "document",
    title: "",
    referenceUrl: "",
    version: "1",
  });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const MAX_BYTES = 20 * 1024 * 1024; // keep in sync with server

  function clearSelection() {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function isHttpUrl(text: string) {
    try {
      const u = new URL(text);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch { return false; }
  }

  function extForType(t: string) {
    if (!t) return '';
    if (t.includes('png')) return '.png';
    if (t.includes('jpeg') || t.includes('jpg')) return '.jpg';
    if (t.includes('webp')) return '.webp';
    return '';
  }

  async function handlePaste(e: React.ClipboardEvent) {
    const dt = e.clipboardData;
    if (!dt) return;

    const text = dt.getData('text');
    if (text && isHttpUrl(text)) {
      e.preventDefault();
      // Pasted URL - just set it as title or reference URL
      clearSelection();
      if (!formData.title) setFormData((fd) => ({ ...fd, title: text }));
      return;
    }

    for (let i = 0; i < dt.items.length; i++) {
      const it = dt.items[i];
      if (it.type && it.type.startsWith('image/')) {
        e.preventDefault();
        const blob = it.getAsFile();
        if (blob) {
          if (blob.size > MAX_BYTES) {
            setUploadError(`Image too large. Max ${Math.floor(MAX_BYTES / (1024 * 1024))}MB.`);
            return;
          }
          const name = `pasted-${Date.now()}${extForType(blob.type)}`;
          const f = new File([blob], name, { type: blob.type });
          setSelectedFile(f);
          const url = URL.createObjectURL(f);
          setPreviewUrl(url);
          setFormData((fd) => ({ ...fd, title: fd.title || name }));
        }
        return;
      }
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setUploadError(`File too large. Max ${Math.floor(MAX_BYTES / (1024 * 1024))}MB.`);
      return;
    }
    setSelectedFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title || !formData.kind) {
      setUploadError("Title and Kind are required");
      return;
    }
    try {
      setUploading(true);
      setUploadError(null);

      const file = selectedFile || fileRef.current?.files?.[0] || null;
      const formDataObj = new FormData();
      
      formDataObj.append("kind", formData.kind);
      formDataObj.append("title", formData.title);
      if (formData.referenceUrl) {
        formDataObj.append("referenceUrl", formData.referenceUrl);
      }
      formDataObj.append("version", String(parseInt(formData.version) || 1));
      
      // Append file if present
      if (file) {
        formDataObj.append("file", file);
      }

      // Upload through backend API (avoids SSL issues with direct S3 PUT)
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: formDataObj,
        credentials: "include",
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Create failed");
      }
      
      const created = await res.json();

      // Reset form and close
      setFormData({ kind: "document", title: "", referenceUrl: "", version: "1" });
      clearSelection();
      setShowAddForm(false);
      await reload?.();
    } catch (err: any) {
      setUploadError(err.message || "Create failed");
    } finally {
      setUploading(false);
    }
  }

  // EditDocumentModal: Edit document, create revision, tag stations
  function EditDocumentModal({ doc, stations, onClose, onSave }) {
    React.useEffect(() => {
      function onKey(e: KeyboardEvent) {
        if (e.key === 'Escape') onClose();
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Fetch the latest version from the revision chain to calculate the next version number
    const [nextVersion, setNextVersion] = React.useState(doc.version + 1);
    React.useEffect(() => {
      (async () => {
        try {
          const res = await fetch(`/api/documents/${doc.id}/revisions`, { credentials: 'include' });
          if (res.ok) {
            const revs = await res.json();
            const maxVer = Array.isArray(revs) && revs.length > 0
              ? Math.max(...revs.map(r => Number(r.version || 0)))
              : doc.version;
            setNextVersion(maxVer + 1);
          }
        } catch { }
      })();
    }, [doc.id, doc.version]);

    const [form, setForm] = useState({
      kind: doc.kind,
      title: doc.title,
      version: nextVersion,
      revisionNote: '',
      referenceUrl: doc.referenceUrl || '',
      notes: doc.notes || '',
      stationIds: doc.documentStations?.map(ds => ds.stationId) || [],
      owner: (doc.tags && (doc.tags.owner || '')) || '',
      rolesCsv: (doc.tags && Array.isArray(doc.tags.roles) ? doc.tags.roles.join(', ') : '')
    });

    // Update form.version whenever nextVersion changes
    React.useEffect(() => {
      setForm(f => ({ ...f, version: nextVersion }));
    }, [nextVersion]);
    const editFileRef = useRef<HTMLInputElement | null>(null);
    const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
    const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
    const [editUploading, setEditUploading] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editDragOver, setEditDragOver] = useState(false);

    function clearEditSelection() {
      setEditSelectedFile(null);
      if (editPreviewUrl) URL.revokeObjectURL(editPreviewUrl);
      setEditPreviewUrl(null);
      if (editFileRef.current) editFileRef.current.value = "";
    }

    async function handleEditPaste(e: React.ClipboardEvent) {
      const dt = e.clipboardData;
      if (!dt) return;

      const text = dt.getData('text');
      if (text && isHttpUrl(text)) {
        e.preventDefault();
        setForm(f => ({ ...f, referenceUrl: text }));
        clearEditSelection();
        if (!form.title) setForm(f => ({ ...f, title: text }));
        return;
      }

      const items = Array.from(dt.items);
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          if (file.size > MAX_BYTES) {
            setEditError(`File too large. Max ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB`);
            return;
          }
          const ext = extForType(file.type);
          const renamed = new File([file], `pasted-${Date.now()}${ext}`, { type: file.type });
          setEditSelectedFile(renamed);
          setEditPreviewUrl(URL.createObjectURL(renamed));
          setEditError(null);
          if (!form.title) setForm(f => ({ ...f, title: renamed.name }));
          break;
        }
      }
    }

    function handleEditDragOver(e: React.DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      setEditDragOver(true);
    }

    function handleEditDragLeave(e: React.DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      setEditDragOver(false);
    }

    function handleEditDrop(e: React.DragEvent) {
      e.preventDefault();
      e.stopPropagation();
      setEditDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const file = files[0];
        if (file.size > MAX_BYTES) {
          setEditError(`File too large. Max ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB`);
          return;
        }
        setEditSelectedFile(file);
        if (file.type.startsWith('image/')) {
          setEditPreviewUrl(URL.createObjectURL(file));
        }
        setEditError(null);
        if (!form.title) setForm(f => ({ ...f, title: file.name }));
      }
    }

    function handleChange(e) {
      const { name, value } = e.target;
      setForm(f => ({ ...f, [name]: value }));
    }
    function handleStationToggle(id) {
      setForm(f => ({
        ...f,
        stationIds: f.stationIds.includes(id)
          ? f.stationIds.filter(sid => sid !== id)
          : [...f.stationIds, id],
      }));
    }

    function handleEditFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > MAX_BYTES) {
          setEditError(`File too large. Max ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB`);
          return;
        }
        setEditSelectedFile(file);
        if (file.type.startsWith('image/')) {
          setEditPreviewUrl(URL.createObjectURL(file));
        }
        setEditError(null);
        setForm(f => ({ ...f, title: f.title || file.name }));
      }
    }

    async function handleSaveRevision() {
      setEditUploading(true);
      setEditError(null);
      try {
        let payload: any = { ...form, stations: form.stationIds };
        // Build ACL tags
        const roles = String(form.rolesCsv || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        payload.tags = { ...(doc.tags || {}), owner: form.owner || null, roles };

        // If a file is selected, upload it first
        if (editSelectedFile) {
          const presignRes = await fetch(`/api/projects/${projectId}/documents/presign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: editSelectedFile.name,
              contentType: editSelectedFile.type,
              sizeBytes: editSelectedFile.size
            }),
            credentials: "include",
          });
          if (!presignRes.ok) {
            const errorText = await presignRes.text();
            throw new Error(errorText || "Presign failed");
          }
          const preJson = await presignRes.json();

          const putRes = await fetch(preJson.putUrl, {
            method: "PUT",
            headers: { "Content-Type": editSelectedFile.type || "application/octet-stream" },
            body: editSelectedFile,
          });
          if (!putRes.ok) throw new Error("Upload failed");

          // Store only the object key; do not persist ephemeral presigned URL
          payload.key = preJson.key;
          payload.storageKey = preJson.key;
          payload.contentType = editSelectedFile.type;
          payload.url = null; // Clear old URL when uploading new file
          if (!payload.title) payload.title = editSelectedFile.name;
        }

        await onSave(doc, payload);
        clearEditSelection();
      } catch (err: any) {
        setEditError(err.message || "Save failed");
      } finally {
        setEditUploading(false);
      }
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div
          className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto"
          onPaste={handleEditPaste}
        >
          <h2 className="text-lg font-bold mb-2">Edit Document (New Revision)</h2>
          {editError && <div className="text-red-600 text-sm mb-2">{editError}</div>}
          <div className="space-y-2">
            <div
              className={`p-3 rounded-lg border-2 border-dashed ${editDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-gray-50'}`}
              onDragOver={handleEditDragOver}
              onDragEnter={handleEditDragOver}
              onDragLeave={handleEditDragLeave}
              onDrop={handleEditDrop}
              tabIndex={0}
              title="Paste image or link here, or drag and drop a file"
            >
              <label className="block text-sm font-medium mb-1">Upload New File (Optional)</label>
              <p className="text-xs text-gray-500 mb-2">Paste image/URL, drag & drop, or choose file</p>
              <input
                type="file"
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                ref={editFileRef}
                onChange={handleEditFileChange}
              />
              {editSelectedFile && (
                <div className="mt-2 p-2 bg-white rounded flex items-center justify-between border">
                  <span className="text-sm">{editSelectedFile.name}</span>
                  <button type="button" onClick={clearEditSelection} className="text-red-600 text-sm hover:underline">Remove</button>
                </div>
              )}
              {editPreviewUrl && (
                <div className="mt-2">
                  <img src={editPreviewUrl} alt="Preview" className="max-h-40 rounded border" />
                </div>
              )}
            </div>
            <input className="w-full border rounded px-2 py-1" name="title" value={form.title} onChange={handleChange} placeholder="Title" />
            <input className="w-full border rounded px-2 py-1" name="version" value={form.version} onChange={handleChange} placeholder="Version" type="number" min={1} />
            <input className="w-full border rounded px-2 py-1" name="referenceUrl" value={form.referenceUrl} onChange={handleChange} placeholder="Reference URL" />
            <textarea className="w-full border rounded px-2 py-1" name="revisionNote" value={form.revisionNote} onChange={handleChange} placeholder="Revision Note (reason for change)" />
            <textarea className="w-full border rounded px-2 py-1" name="notes" value={form.notes} onChange={handleChange} placeholder="Notes" />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm mb-1">Owner (user id/email)</label>
                <input className="w-full border rounded px-2 py-1" name="owner" value={form.owner} onChange={handleChange} placeholder="e.g., user@example.com" />
              </div>
              <div>
                <label className="block text-sm mb-1">Visible Roles (comma)</label>
                <input className="w-full border rounded px-2 py-1" name="rolesCsv" value={form.rolesCsv} onChange={handleChange} placeholder="manager, supervisor" />
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1">Tag Stations</div>
              <div className="flex flex-wrap gap-2">
                {stations.map(st => (
                  <label key={st.id} className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={form.stationIds.includes(st.id)} onChange={() => handleStationToggle(st.id)} />
                    {st.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              className="bg-indigo-600 text-white px-4 py-1 rounded disabled:bg-gray-400"
              onClick={handleSaveRevision}
              disabled={editUploading}
            >
              {editUploading ? 'Saving...' : 'Save Revision'}
            </button>
            <button className="border px-4 py-1 rounded" onClick={onClose} disabled={editUploading}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  // RevisionHistoryModal: Show all versions, allow activating any
  function RevisionHistoryModal({ doc, history, onClose, onActivate }) {
    React.useEffect(() => {
      function onKey(e: KeyboardEvent) {
        if (e.key === 'Escape') onClose();
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    // Add per-version delete button
    const [pendingDelete, setPendingDelete] = React.useState(null);
    const [deleteMode, setDeleteMode] = React.useState<'single' | 'all'>('single');
    const [deleteHasChain, setDeleteHasChain] = React.useState(false);
    async function confirmDeleteVersion(versionDoc) {
      setPendingDelete(versionDoc);
      setDeleteMode('single');
      // Only root can have chain
      let hasChain = false;
      if (!versionDoc.parentId) {
        try {
          const res = await fetch(`/api/documents/${versionDoc.id}/revisions`, { credentials: 'include' });
          if (res.ok) {
            const revs = await res.json();
            hasChain = Array.isArray(revs) && revs.length > 1;
          }
        } catch { }
      }
      setDeleteHasChain(hasChain);
    }
    async function handleDeleteVersion() {
      if (!pendingDelete) return;
      if (deleteMode === 'all') {
        await fetch(`/api/documents/${pendingDelete.id}/all`, { method: 'DELETE', credentials: 'include' });
      } else {
        await fetch(`/api/documents/${pendingDelete.id}`, { method: 'DELETE', credentials: 'include' });
      }
      setPendingDelete(null);
      setDeleteMode('single');
      setDeleteHasChain(false);
      onClose(); // Close modal after delete
    }
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl shadow-lg max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-bold mb-4">Revision History - {doc.title}</h2>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm mb-4">No revision history available.</p>
          ) : (
            <div className="space-y-3 mb-4">
              {history.map(r => (
                <div
                  key={r.id}
                  className={`border rounded-lg p-4 ${r.active ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-lg">Version {r.version}</span>
                        {r.active && (
                          <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">Active</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Title:</span> {r.title}
                      </div>
                      {r.revisionNote && (
                        <div className="text-sm mb-2">
                          <span className="font-medium text-gray-700">Revision Note:</span>
                          <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-gray-800">
                            {r.revisionNote}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 space-y-1">
                        <div><span className="font-medium">Created:</span> {new Date(r.createdAt).toLocaleString()}</div>
                        <div><span className="font-medium">Kind:</span> {r.kind || 'document'}</div>
                        {r.contentType && <div><span className="font-medium">Type:</span> {r.contentType}</div>}
                      </div>
                      {r.notes && (
                        <div className="text-sm mt-2">
                          <span className="font-medium text-gray-700">Notes:</span>
                          <div className="mt-1 text-gray-600">{r.notes}</div>
                        </div>
                      )}
                      {r.referenceUrl && (
                        <div className="text-sm mt-2">
                          <span className="font-medium text-gray-700">Reference URL:</span>
                          <a
                            href={r.referenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline ml-1"
                          >
                            {r.referenceUrl}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                        onClick={async () => {
                          try {
                            const r2 = await fetch(`/api/documents/${r.id}/url`, { credentials: 'include' });
                            const js2 = await r2.json();
                            if (r2.ok && js2?.url) window.open(js2.url, '_blank', 'noopener');
                          } catch { }
                        }}
                      >
                        View File
                      </button>
                      <button
                        className="px-3 py-1 border border-indigo-600 text-indigo-600 text-sm rounded hover:bg-indigo-50"
                        onClick={() => openShareModal([r])}
                      >
                        Share
                      </button>
                      {!r.active && (
                        <button
                          className="px-3 py-1 border border-green-600 text-green-600 text-sm rounded hover:bg-green-50"
                          onClick={() => onActivate(r.id)}
                        >
                          Activate
                        </button>
                      )}
                      <button
                        className="px-3 py-1 border border-red-600 text-red-600 text-sm rounded hover:bg-red-50"
                        onClick={() => confirmDeleteVersion(r)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded" onClick={onClose}>Close</button>
          {pendingDelete && (
            <DeleteConfirmModal
              doc={pendingDelete}
              onClose={() => setPendingDelete(null)}
              onConfirm={handleDeleteVersion}
              mode={deleteMode}
              setMode={setDeleteMode}
              hasChain={deleteHasChain}
            />
          )}
        </div>
      </div>
    );
  }

  // DeleteConfirmModal: Confirm before deleting
  function DeleteConfirmModal({ doc, onClose, onConfirm, mode, setMode, hasChain }) {
    React.useEffect(() => {
      function onKey(e: KeyboardEvent) {
        if (e.key === 'Escape') onClose();
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
          <h2 className="text-lg font-bold mb-2">Delete Document</h2>
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete <span className="font-semibold">"{doc.title}"</span>?
          </p>
          {hasChain && (
            <div className="mb-4">
              <label className="block font-medium mb-1">Delete options:</label>
              <label className="flex items-center gap-2 mb-1">
                <input type="radio" checked={mode === 'single'} onChange={() => setMode('single')} /> Delete only this version
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} /> Delete all versions in this chain
              </label>
            </div>
          )}
          <p className="text-sm text-red-600 mb-4">This action cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <button
              className="px-4 py-2 border rounded hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={onConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ShareModal: Select files/versions, enter reason, generate links
  function ShareModal({ targets = [], onClose }) {
    // Preselect only the active revision; if none, preselect the highest version
    const initialSelected = React.useMemo(() => {
      if (!Array.isArray(targets) || targets.length === 0) return [];
      const actives = targets.filter(t => t.active);
      if (actives.length > 0) return actives.map(t => t.id);
      const max = targets.reduce((acc, t) => (Number(t.version || 0) > Number(acc.version || 0) ? t : acc), targets[0]);
      return max ? [max.id] : [];
    }, [targets]);
    const [selected, setSelected] = useState(initialSelected);
    const [reason, setReason] = useState("");
    const [shareLinks, setShareLinks] = useState([]);
    const [generating, setGenerating] = useState(false);

    React.useEffect(() => {
      function onKey(e: KeyboardEvent) {
        if (e.key === 'Escape') onClose();
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    function toggle(id) {
      setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
    }

    async function handleShare() {
      setGenerating(true);
      try {
        const links = [];
        for (const id of selected) {
          const target = targets.find(t => t.id === id);
          if (!target) continue;

          // Fetch the shareable URL for this document/version
          const res = await fetch(`/api/documents/${id}/url`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              links.push({
                id,
                title: target.title || `Version ${target.version}`,
                url: data.url,
                reason
              });
            }
          }
        }
        setShareLinks(links);
      } catch (err) {
        console.error('Failed to generate share links:', err);
        alert('Failed to generate share links');
      } finally {
        setGenerating(false);
      }
    }

    function copyToClipboard(text) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Link copied to clipboard!');
      });
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-bold mb-2">Share Document{targets.length > 1 ? 's' : ''}</h2>

          {shareLinks.length === 0 ? (
            <>
              <div className="mb-4">
                <div className="mb-2 font-medium">Select files/versions to share:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2">
                  {targets.map(t => (
                    <label key={t.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />
                      <span className="text-sm">{`v${t.version ?? '?'} — ${t.title || 'Untitled'}`}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block font-medium mb-1">Reason for sharing (optional):</label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={3}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Enter reason for sharing (e.g., 'Client review', 'Team feedback')"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button className="px-4 py-2 border rounded hover:bg-gray-50" onClick={onClose}>Cancel</button>
                <button
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  onClick={handleShare}
                  disabled={selected.length === 0 || generating}
                >
                  {generating ? 'Generating...' : 'Generate Share Links'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <div className="mb-2 font-medium text-green-600">✓ Share links generated successfully!</div>
                {reason && (
                  <div className="text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded">
                    <span className="font-medium">Reason:</span> {reason}
                  </div>
                )}
                <div className="space-y-3">
                  {shareLinks.map(link => (
                    <div key={link.id} className="border rounded p-3 bg-gray-50">
                      <div className="font-medium text-sm mb-1">{link.title}</div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          className="flex-1 text-xs border rounded px-2 py-1 bg-white"
                          value={link.url}
                          readOnly
                        />
                        <button
                          className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                          onClick={() => copyToClipboard(link.url)}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={onClose}>Close</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">Files</div>
        <button onClick={() => setShowAddForm(!showAddForm)} className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm hover:bg-indigo-700">
          {showAddForm ? "Cancel" : "Add Document"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} onPaste={handlePaste} className="mb-4 p-4 border rounded-lg space-y-4">
          {/* File Upload Section */}
          <div
            className={`p-3 rounded-lg border-2 border-dashed focus:outline-none ${dragOver ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950' : 'bg-gray-50 dark:bg-neutral-800'}`}
            tabIndex={0}
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            title="Paste image or link here"
          >
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload File or Paste Image/Link</label>
            <input
              type="file"
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              ref={fileRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (!formData.title) setFormData({ ...formData, title: file.name });
                  setSelectedFile(file);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
                }
              }}
            />
            {previewUrl && selectedFile && (
              <div className="mt-3 flex items-start gap-3">
                <img src={previewUrl} alt="preview" className="h-20 w-20 object-cover rounded border" />
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <div className="font-medium">{selectedFile.name}</div>
                  <div>{(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'file'}</div>
                  <button type="button" onClick={clearSelection} className="mt-2 px-2 py-1 border rounded">Remove</button>
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">Tip: Paste an image (Ctrl/Cmd+V) or a link into this box to attach quickly.</p>
          </div>

          {/* Document Metadata */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Kind</label>
              <select className="w-full rounded border px-3 py-2" value={formData.kind} onChange={(e) => setFormData({ ...formData, kind: e.target.value })}>
                <option value="document">Document</option>
                <option value="drawing">Drawing</option>
                <option value="spec">Specification</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Title *</label>
              <input className="w-full rounded border px-3 py-2" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Document title" required />
            </div>
            <div>
              {/* Shared URL field removed as per new requirements */}
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Reference URL (optional)</label>
              <input className="w-full rounded border px-3 py-2" value={formData.referenceUrl} onChange={(e) => setFormData({ ...formData, referenceUrl: e.target.value })} placeholder="https://... (external reference link)" />
              <p className="mt-1 text-xs text-gray-500">Link to external documentation, specifications, or related resources.</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Version</label>
              <input type="number" className="w-full rounded border px-3 py-2" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} min="1" />
            </div>
          </div>

          {uploadError && <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{uploadError}</div>}
          <div className="flex gap-2">
            <button type="submit" disabled={uploading} className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm hover:bg-indigo-700 disabled:opacity-60">
              {uploading ? "Creating..." : "Create Document"}
            </button>
            <button type="button" onClick={() => setShowAddForm(false)} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-3">
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr><th>Kind</th><th>Title</th><th>Version</th><th>Active</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {(documents ?? []).map((d) => (
                <tr key={d.id} className="border-t dark:border-neutral-800">
                  <td className="py-2">{d.kind}</td>
                  <td>
                    <div>
                      <button
                        className="text-indigo-600 underline"
                        onClick={async () => {
                          try {
                            const r = await fetch(`/api/documents/${d.id}/url`, { credentials: 'include' });
                            const js = await r.json();
                            if (r.ok && js?.url) window.open(js.url, '_blank', 'noopener');
                          } catch { }
                        }}
                      >
                        {d.title}
                      </button>
                      {d.referenceUrl && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Reference: <a className="text-indigo-500 hover:underline" href={d.referenceUrl} target="_blank" rel="noreferrer">{d.referenceUrl}</a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{d.activeVersion ?? d.version}</td>
                  <td>{d.active ? "Yes" : "No"}</td>
                  <td className="space-x-2">
                    {d.active ? (
                      <button className="px-2 py-1 border rounded" onClick={() => handleDeactivate(d.id)}>Deactivate</button>
                    ) : (
                      <button className="px-2 py-1 border rounded" onClick={() => handleActivate(d.id)}>Activate</button>
                    )}
                    <button className="px-2 py-1 border rounded" onClick={() => openEdit(d)}>Edit</button>
                    <button className="px-2 py-1 border rounded" onClick={() => openHistory(d)}>History</button>
                    <button className="px-2 py-1 border rounded text-blue-600 hover:bg-blue-50" onClick={() => openApproval(d)}>Request Approval</button>
                    <button
                      className="px-2 py-1 border rounded text-red-600 hover:bg-red-50"
                      onClick={() => confirmDelete(d)}
                    >
                      Delete
                    </button>
                    <button
                      className="px-2 py-1 border rounded text-indigo-600 hover:bg-indigo-50"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/documents/${d.id}/revisions`, { credentials: 'include' });
                          if (res.ok) {
                            const revs = await res.json();
                            // Sort by version desc so the latest is first
                            const sorted = Array.isArray(revs) ? [...revs].sort((a, b) => (b.version || 0) - (a.version || 0)) : [d];
                            openShareModal(sorted);
                          } else {
                            openShareModal([d]);
                          }
                        } catch {
                          openShareModal([d]);
                        }
                      }}
                    >
                      Share
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-6">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={showAggregated} onChange={(e) => setShowAggregated(e.target.checked)} />
          <span className="text-sm font-medium">Show All Files (Aggregated from all modules)</span>
        </label>
        {showAggregated && (
          <div className="mt-3 border rounded-lg dark:border-neutral-700">
            <div className="px-3 py-2 bg-gray-50 dark:bg-neutral-800 border-b dark:border-neutral-700 flex items-center justify-between">
              <span className="font-medium text-sm">Aggregated Files ({aggregatedFiles.length})</span>
              <select
                className="text-xs border rounded px-2 py-1 dark:bg-neutral-900 dark:border-neutral-600"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="all">All Modules</option>
                <option value="documents">Documents</option>
                <option value="compliance">Compliance</option>
                <option value="preproduction">PreProduction</option>
                <option value="planning">Planning</option>
                <option value="board">Board</option>
              </select>
            </div>
            {aggregatedLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">Loading files...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="px-3 py-2">Module</th>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedFiles.map((file) => (
                      <tr key={file.id} className="border-t dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800">
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${file.module === 'documents' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                              file.module === 'compliance' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                file.module === 'preproduction' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                  file.module === 'planning' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                            }`}>
                            {file.module}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{file.title}</div>
                            {file.metadata && Object.keys(file.metadata).length > 0 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {file.metadata.complianceName && `Compliance: ${file.metadata.complianceName}`}
                                {file.metadata.flowName && `Flow: ${file.metadata.flowName}`}
                                {file.metadata.taskTitle && `Task: ${file.metadata.taskTitle}`}
                                {file.metadata.planDate && `Plan: ${new Date(file.metadata.planDate).toLocaleDateString()}`}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{file.type}</td>
                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 space-x-2">
                          {file.url ? (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 border rounded text-xs hover:bg-gray-100 dark:hover:bg-neutral-700"
                            >
                              View
                            </a>
                          ) : file.module === 'documents' && (
                            <button
                              className="px-2 py-1 border rounded text-xs hover:bg-gray-100 dark:hover:bg-neutral-700"
                              onClick={async () => {
                                try {
                                  const r = await fetch(`/api/documents/${file.sourceId}/url`, { credentials: 'include' });
                                  const js = await r.json();
                                  if (r.ok && js?.url) window.open(js.url, '_blank', 'noopener');
                                } catch { }
                              }}
                            >
                              View
                            </button>
                          )}
                          <a
                            href={file.contextUrl}
                            className="px-2 py-1 border rounded text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          >
                            View in Context
                          </a>
                        </td>
                      </tr>
                    ))}
                    {aggregatedFiles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-gray-500 dark:text-gray-400 py-8">
                          No files found for selected module
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-6">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={showComplianceDocs} onChange={(e) => setShowComplianceDocs(e.target.checked)} />
          <span className="text-sm">Show Compliance Documents for this project</span>
        </label>
        {showComplianceDocs && (
          <div className="mt-3 border rounded-lg">
            <div className="px-3 py-2 bg-gray-50 font-medium text-sm">Compliance Documents</div>
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr><th>Type</th><th>Name</th><th>Compliance</th><th>Uploaded</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {complianceDocs.map((cd) => (
                  <div key={cd.id} className="contents">
                    <tr className="border-t">
                      <td className="py-2">{cd.documentType}</td>
                      <td>{cd.documentName}</td>
                      <td>{cd.compliance?.complianceName || '-'}</td>
                      <td>{new Date(cd.uploadedAt).toLocaleDateString()}</td>
                      <td>
                        {cd.fileUrl && (
                          <a href={cd.fileUrl} target="_blank" rel="noreferrer" className="px-2 py-1 border rounded">View</a>
                        )}
                      </td>
                    </tr>
                  </div>
                ))}
                {complianceDocs.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-500 py-3">No compliance documents</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Edit Modal and History Modal rendered outside table for valid HTML */}
      {showEditModal && editDoc && (
        <EditDocumentModal
          doc={editDoc}
          stations={stations}
          onClose={() => setShowEditModal(false)}
          onSave={handleRevise}
        />
      )}
      {showHistoryModal && historyDoc && (
        <RevisionHistoryModal
          doc={historyDoc}
          history={history}
          onClose={() => setShowHistoryModal(false)}
          onActivate={handleActivate}
        />
      )}
      {showDeleteModal && deleteDoc && (
        <DeleteConfirmModal
          doc={deleteDoc}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          mode={deleteMode}
          setMode={setDeleteMode}
          hasChain={deleteHasChain}
        />
      )}
      {showShareModal && (
        <ShareModal
          targets={shareTargets}
          onClose={closeShareModal}
        />
      )}
      {showApprovalModal && approvalDoc && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-3">Request Approval</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Title</label>
                <input className="w-full border rounded px-3 py-2" value={approvalForm.title} onChange={(e) => setApprovalForm({ ...approvalForm, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Approver Name</label>
                  <input className="w-full border rounded px-3 py-2" value={approvalForm.contactPerson} onChange={(e) => setApprovalForm({ ...approvalForm, contactPerson: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Approver Email</label>
                  <input type="email" className="w-full border rounded px-3 py-2" value={approvalForm.contactEmail} onChange={(e) => setApprovalForm({ ...approvalForm, contactEmail: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Due Date</label>
                  <input type="date" className="w-full border rounded px-3 py-2" value={approvalForm.dueDate} onChange={(e) => setApprovalForm({ ...approvalForm, dueDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Expected Date</label>
                  <input type="date" className="w-full border rounded px-3 py-2" value={approvalForm.expectedDate} onChange={(e) => setApprovalForm({ ...approvalForm, expectedDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Priority</label>
                <select className="w-full border rounded px-3 py-2" value={approvalForm.priority} onChange={(e) => setApprovalForm({ ...approvalForm, priority: e.target.value as any })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <textarea className="w-full border rounded px-3 py-2" rows={3} value={approvalForm.notes} onChange={(e) => setApprovalForm({ ...approvalForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 border rounded" onClick={() => setShowApprovalModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={async () => {
                try {
                  await createApproval({
                    projectId,
                    approvalType: 'document',
                    title: approvalForm.title || approvalDoc.title || 'Document Approval',
                    description: `Approval requested for document #${approvalDoc.id} - ${approvalDoc.title}`,
                    contactPerson: approvalForm.contactPerson || undefined,
                    contactEmail: approvalForm.contactEmail || undefined,
                    contactPhone: approvalForm.contactPhone || undefined,
                    dueDate: approvalForm.dueDate || undefined,
                    expectedDate: approvalForm.expectedDate || undefined,
                    priority: approvalForm.priority as any,
                  });
                  setShowApprovalModal(false);
                  alert('Approval request created');
                } catch (e) {
                  console.error(e);
                  alert('Failed to create approval');
                }
              }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
