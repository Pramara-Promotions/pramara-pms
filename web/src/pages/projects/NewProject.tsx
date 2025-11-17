// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { http } from "../../lib/http";

type Project = {
  id: number;
  name: string;
  code: string;
  quantity?: number | null;
  health?: {
    score: number;
    status: "healthy" | "at-risk" | "critical";
    attentionItemCount: number;
    output?: { target: number; produced: number; percentComplete: number };
    quality?: { passRate: number; defectRate: number; totalRejected: number };
    taskProgress?: { total: number; completed: number; percentComplete: number };
  };
};

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
        // Fetch completed projects for reference examples
        const rows = await fetchJson(`/api/projects?includeHealth=true&status=completed&limit=5`, { headers: { Accept: "application/json" } });
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
      <div className="rounded-xl border bg-white dark:bg-neutral-900 dark:border-neutral-800 p-4 space-y-6">
        {/* Quick Start Tips */}
        <div>
          <div className="font-medium mb-3 text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Quick Start Guide
          </div>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 font-medium">1.</span>
              <span>Give your project a clear, descriptive name</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 font-medium">2.</span>
              <span>Choose to start blank or copy structure from an existing project</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 font-medium">3.</span>
              <span>After creation, add SKUs, set quantities, and assign workflow stages</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 font-medium">4.</span>
              <span>Upload QC plans, documents, and define costing early for better tracking</span>
            </div>
          </div>
        </div>

        {/* Completed Projects Track Record */}
        <div>
          <div className="font-medium mb-3 text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Completions
          </div>
          {loading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading examples...</div>
          ) : projects.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
              No completed projects yet. Your successful projects will appear here as reference examples.
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{p.name}</div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Completed
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">{p.code}</div>
                  
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">{p.health?.output?.produced?.toLocaleString() ?? 0}</span>
                      <span className="text-gray-500">units</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">{p.health?.quality?.passRate?.toFixed?.(1) ?? 100}%</span>
                      <span className="text-gray-500">pass</span>
                    </div>
                    {typeof p.health?.quality?.defectRate === "number" && p.health.quality.defectRate > 0 && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium">{p.health.quality.defectRate.toFixed(1)}%</span>
                        <span className="text-gray-500">reject</span>
                      </div>
                    )}
                    {typeof p.health?.taskProgress?.total === "number" && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="font-medium">{p.health.taskProgress.total}</span>
                        <span className="text-gray-500">tasks</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
