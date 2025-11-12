// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { http } from "../../lib/http";

type Project = { id: number; name: string; code: string };

async function fetchJson(url: string, init?: RequestInit) {
  const r = await http(url, init);
  const t = await r.text();
  if (!r.ok) throw new Error(t || `HTTP ${r.status}`);
  return t ? JSON.parse(t) : {};
}

const slug = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function NewProject() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [mode, setMode] = useState<"blank" | "fromExisting">("blank");
  const [templateId, setTemplateId] = useState<number | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const rows = await fetchJson(`/api/projects`, { headers: { Accept: "application/json" } });
        setProjects(Array.isArray(rows) ? rows : []);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const existingOptions = useMemo(() => projects.slice(0, 20), [projects]);

  async function create() {
    const label = name.trim();
    if (!label) return;

    const res = await http(`/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: label,
        code: slug(label) || `TEMP-${Date.now()}`,
        quantity: 0
      }),
    });
    if (!res.ok) throw new Error(`Create failed (${res.status})`);
    const proj = await res.json();

    navigate({ to: "/projects/$id", params: { id: String(proj.id) } });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">New project</h1>
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Project name</label>
          <input
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Spring 26 line"
          />
        </div>
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-900 dark:text-white">Start from</div>
          <label className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <input
              type="radio"
              name="startFrom"
              checked={mode === "blank"}
              onChange={() => setMode("blank")}
            />
            <span className="text-sm">Blank project (set up later)</span>
          </label>
          <label className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <input
              type="radio"
              name="startFrom"
              checked={mode === "fromExisting"}
              onChange={() => setMode("fromExisting")}
            />
            <span className="text-sm">Use an existing project as a template</span>
          </label>
          {mode === "fromExisting" && (
            <div className="ml-6">
              <select
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
                value={templateId ?? ""}
                onChange={(e) => setTemplateId(Number(e.target.value) || null)}
              >
                <option value="">Select a project</option>
                {existingOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                We will copy the layout and fields you already use there.
              </div>
            </div>
          )}
        </div>
        <div>
          <button
            onClick={create}
            disabled={!name.trim()}
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
          >
            Continue
          </button>
        </div>
      </div>
      <div className="rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4">
        <div className="font-medium mb-4 text-gray-900 dark:text-white">Whats happening</div>
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading snapshot</div>
        ) : projects.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            You will see a quick overview once you have a few active projects.
          </div>
        ) : (
          <div className="space-y-4">
            {projects.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="rounded-lg border px-3 py-3 dark:border-neutral-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{p.code}</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    <span>Major milestones will appear here</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>Ongoing tasks and status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Charts and metrics overview</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="text-xs text-gray-500 dark:text-gray-400 italic mt-3">
              Note: This panel will display real milestones ongoing activities charts and metrics once project stages and workflows are fully configured.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
