// web/src/pages/projects/ProjectsList.tsx
// @ts-nocheck

/****************************************************
 * [LMK-10] IMPORTS
 ****************************************************/
import React, { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useToast } from "../../ui/toast/ToastProvider";
import { http } from "../../lib/http";

/****************************************************
 * [LMK-20] TYPES
 ****************************************************/
type Project = { id: number; code: string; name: string };

/****************************************************
 * [LMK-30] CONSTANTS / HELPERS
 ****************************************************/
// Use centralized http helper which resolves API base and handles auth/refresh

/****************************************************
 * [LMK-40] COMPONENT
 ****************************************************/
export default function ProjectsList() {
  const navigate = useNavigate();
  const { showToastOk, showToastErr } = useToast(); // use global toast only

  // [LMK-41] Data/edit state
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [newName, setNewName] = useState("");

  // [LMK-42] Load projects
  async function load() {
    console.log('[ProjectsList] Starting load...');
    try {
      setLoading(true);
      setError(null);
      const res = await http(`/api/projects`, { headers: { Accept: "application/json" } });
      console.log('[ProjectsList] API response status:', res.status);
      if (res.status === 401) {
        navigate({ to: "/login", replace: true });
        return;
      }
      const txt = await res.text();
      console.log('[ProjectsList] Response text:', txt.substring(0, 200));
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      if (txt.trim().startsWith("<"))
        throw new Error("Got HTML instead of JSON (check VITE_API_URL / proxy)");
      const data = JSON.parse(txt);
      console.log('[ProjectsList] Loaded projects:', data.length);
      setItems(data);
    } catch (e: any) {
      const msg = e?.message || "Failed to load projects";
      console.error('[ProjectsList] Load error:', e);
      setError(msg);
      showToastErr(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    console.log('[ProjectsList] Component mounted, calling load()');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // [LMK-43] Edit helpers
  function startEdit(p: Project) {
    setEditId(p.id);
    setName(p.name);
    setCode(p.code);
  }
  function cancelEdit() {
    setEditId(null);
    setName("");
    setCode("");
  }

  // [LMK-44] Save edit
  async function saveEdit() {
    if (!editId) return;
    try {
      const res = await http(`/api/projects/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, code }),
      });
      if (!res.ok) throw new Error(`Update project failed (${res.status})`);
      await load();
      cancelEdit();
      showToastOk("Project updated.");
    } catch (e: any) {
      showToastErr(e?.message || "Update project failed");
    }
  }

  // [LMK-45] Create
  async function createProject() {
    const label = newName.trim();
    if (!label) return;
    try {
      const res = await http(`/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ 
          name: label, 
          code: `TEMP-${Date.now()}`,
          quantity: 0  // Default quantity for new projects
        }),
      });
      if (!res.ok) throw new Error(`Create failed (${res.status})`);
      setNewName("");
      await load();
      showToastOk(`Project "${label}" created.`);
    } catch (e: any) {
      showToastErr(e?.message || "Create project failed");
    }
  }

  // [LMK-46] Delete
  async function removeProject(p: Project) {
    if (!confirm(`Delete project “${p.name}”? This cannot be undone.`)) return;
    try {
      const res = await http(`/api/projects/${p.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setItems((list) => list.filter((x) => x.id !== p.id)); // optimistic
      showToastOk(`Project “${p.name}” deleted successfully.`);
    } catch (e: any) {
      showToastErr(e?.message || "Delete project failed");
    }
  }

  /****************************************************
   * [LMK-50] RENDER
   ****************************************************/
  console.log('[ProjectsList] Rendering - loading:', loading, 'items:', items.length, 'error:', error);
  
  return (
    <div className="space-y-6">
      {/* [LMK-51] Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <button
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
          onClick={() => navigate({ to: "/projects/new" })}
        >
          Create Project
        </button>
      </div>

      {/* [LMK-52] Error banner */}
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      {/* [LMK-53] Edit strip */}
      {editId && (
        <div className="rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4 flex items-center gap-3">
          <input
            className="w-64 rounded-lg border px-3 py-2"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-80 rounded-lg border px-3 py-2"
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            onClick={saveEdit}
            className="ml-auto rounded-lg bg-indigo-600 text-white px-3 py-2 hover:bg-indigo-700"
          >
            Save
          </button>
          <button
            onClick={cancelEdit}
            className="rounded-lg border px-3 py-2 hover:bg-gray-50 dark:border-neutral-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* [LMK-54] List all projects (staged view coming soon) */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4 text-sm text-gray-500">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-6">
            <div className="text-sm text-gray-600">No projects yet. Click "Create Project" to get started.</div>
          </div>
        ) : (
          items.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.code}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 dark:border-neutral-700"
                        onClick={() => navigate({ to: "/projects/$id", params: { id: String(p.id) } })}
                      >
                        Open
                      </button>
                      <button
                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50 dark:border-neutral-700"
                        onClick={() => startEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-lg border px-3 py-1.5 text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => removeProject(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
          ))
        )}
      </div>

      {/* No inline create form; use top button */}
    </div>
  );
}
