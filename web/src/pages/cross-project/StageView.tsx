import { useMemo, useState } from "react";
import { Link, useMatch } from "@tanstack/react-router";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, XAxis, YAxis } from "recharts";
import { AlertTriangle, Users, Cpu, Layers, TrendingUp } from "lucide-react";
import { useTasks, RAG, Task } from "../../features/tasks/state/tasks.store";

const STATUS_COLS: { id: RAG; title: string }[] = [
  { id: "red", title: "At Risk" },
  { id: "amber", title: "Attention" },
  { id: "green", title: "On Track" },
];

function projectColor(projectId?: string) {
  if (!projectId) return "border-gray-200";
  const colors = [
    "border-indigo-400",
    "border-emerald-400",
    "border-amber-400",
    "border-rose-400",
    "border-sky-400",
    "border-violet-400",
  ];
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

export default function StageView() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const { params: { stage } } = useMatch({ from: "/layout/stages/$stage" });
  const { tasks, updateTask } = useTasks();

  // Filters
  const [project, setProject] = useState<string | "All">("All");
  const [assignee, setAssignee] = useState<string | "All">("All");

  const validStages = ["Pre-Prod", "Production", "QC", "Dispatch"] as const;
  const stageName = decodeURIComponent(stage ?? "");
  const isValid = (validStages as readonly string[]).includes(stageName);

  const filtered = useMemo(() => {
    const base = tasks.filter((t) => t.section === (stageName as any));
    return base.filter((t) => {
      if (project !== "All" && t.projectId !== project) return false;
      if (assignee !== "All" && (t.assignee ?? "") !== assignee) return false;
      return true;
    });
  }, [tasks, stageName, project, assignee]);

  const projects = useMemo(() => Array.from(new Set(tasks.map((t) => t.projectId).filter(Boolean))) as string[], [tasks]);
  const assignees = useMemo(() => Array.from(new Set(tasks.map((t) => t.assignee).filter(Boolean))) as string[], [tasks]);

  const byStatus = useMemo(() => {
    return STATUS_COLS.reduce<Record<RAG, Task[]>>((acc, s) => {
      acc[s.id] = filtered.filter((t) => t.status === s.id);
      return acc;
    }, { red: [], amber: [], green: [] });
  }, [filtered]);

  // Capacity and bottleneck analytics
  const analytics = useMemo(() => {
    const totalTasks = filtered.length;
    const assigneeLoad = assignees.map((a) => {
      const assignedTasks = filtered.filter((t) => t.assignee === a);
      const load = assignedTasks.length;
      const atRisk = assignedTasks.filter((t) => t.status === "red").length;
      return { assignee: a, load, atRisk, utilization: Math.min((load / 10) * 100, 100) };
    });

    const projectLoad = projects.map((p) => {
      const projectTasks = filtered.filter((t) => t.projectId === p);
      return { project: p, tasks: projectTasks.length };
    });

    const stationLoad = [
      { station: "Station A", load: Math.floor(Math.random() * 8) + 2, capacity: 10 },
      { station: "Station B", load: Math.floor(Math.random() * 8) + 2, capacity: 10 },
      { station: "Station C", load: Math.floor(Math.random() * 8) + 2, capacity: 10 },
    ];

    const bottlenecks = [
      ...assigneeLoad.filter((a) => a.load > 8 || a.atRisk > 2).map((a) => ({
        type: "Assignee Overload",
        target: a.assignee,
        reason: a.load > 8 ? `${a.load} tasks assigned (overloaded)` : `${a.atRisk} tasks at risk`,
        severity: a.load > 8 ? "high" : "medium",
      })),
      ...stationLoad.filter((s) => s.load / s.capacity > 0.8).map((s) => ({
        type: "Station Capacity",
        target: s.station,
        reason: `${Math.round((s.load / s.capacity) * 100)}% capacity (${s.load}/${s.capacity})`,
        severity: s.load / s.capacity > 0.9 ? "high" : "medium",
      })),
      ...byStatus.red.filter((t) => t.priority === "High").map((t) => ({
        type: "Blocked Task",
        target: t.name,
        reason: "High priority task at risk",
        severity: "high" as const,
      })),
    ];

    return {
      totalTasks,
      assigneeLoad,
      projectLoad,
      stationLoad,
      bottlenecks,
      workforceUtilization: assignees.length > 0 ? Math.round((assigneeLoad.reduce((sum, a) => sum + a.utilization, 0) / assignees.length)) : 0,
      machineUtilization: Math.round((stationLoad.reduce((sum, s) => sum + (s.load / s.capacity) * 100, 0) / stationLoad.length)),
    };
  }, [filtered, assignees, projects, byStatus]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const id = String(active.id);
    const overId = String(over.id);
    const overIsCol = STATUS_COLS.some((c) => c.id === (overId as RAG));
    if (overIsCol) {
      updateTask(id, { status: overId as RAG });
    }
  }

  if (!isValid) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Unknown stage</h1>
        <p className="text-sm text-gray-600">Stage "{stageName}" is not valid. Try one of: Pre-Prod, Production, QC, Dispatch.</p>
        <Link to="/tasks" className="text-accent">Go to Tasks</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{stageName} — Cross-Project View</h1>
          <p className="text-sm text-gray-600">All tasks in this stage across all projects. Drag between columns to update status.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border rounded-lg px-2 py-1.5 text-sm" value={project} onChange={(e) => setProject(e.target.value as any)}>
            <option value="All">All Projects</option>
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select className="border rounded-lg px-2 py-1.5 text-sm" value={assignee} onChange={(e) => setAssignee(e.target.value as any)}>
            <option value="All">All Assignees</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottleneck Alerts */}
      {analytics.bottlenecks.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-red-900">Bottlenecks Detected ({analytics.bottlenecks.length})</h2>
          </div>
          <div className="space-y-2">
            {analytics.bottlenecks.slice(0, 5).map((bottleneck, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  bottleneck.severity === "high" ? "bg-red-100 border border-red-300" : "bg-amber-50 border border-amber-200"
                }`}
              >
                <div
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    bottleneck.severity === "high" ? "bg-red-600 text-white" : "bg-amber-600 text-white"
                  }`}
                >
                  {bottleneck.severity === "high" ? "HIGH" : "MED"}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{bottleneck.type}: {bottleneck.target}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{bottleneck.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Capacity Charts */}
      <div className="grid md:grid-cols-4 gap-3">
        {/* Workforce Utilization */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-sm">Workforce</h3>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600">{analytics.workforceUtilization}%</div>
            <div className="text-xs text-gray-500 mt-1">Utilization</div>
          </div>
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                analytics.workforceUtilization > 80 ? "bg-red-500" : analytics.workforceUtilization > 60 ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${analytics.workforceUtilization}%` }}
            />
          </div>
        </div>

        {/* Machine Utilization */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-sm">Machines</h3>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{analytics.machineUtilization}%</div>
            <div className="text-xs text-gray-500 mt-1">Utilization</div>
          </div>
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                analytics.machineUtilization > 80 ? "bg-red-500" : analytics.machineUtilization > 60 ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${analytics.machineUtilization}%` }}
            />
          </div>
        </div>

        {/* Station Load */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-sm">Stations</h3>
          </div>
          <div className="space-y-2">
            {analytics.stationLoad.map((s) => (
              <div key={s.station} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{s.station}</span>
                <span className={`font-medium ${s.load / s.capacity > 0.8 ? "text-red-600" : "text-gray-900"}`}>
                  {s.load}/{s.capacity}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Distribution */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-sm">Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <PieChart>
              <Pie
                data={[
                  { name: "At Risk", value: byStatus.red.length, color: "#ef4444" },
                  { name: "Attention", value: byStatus.amber.length, color: "#f59e0b" },
                  { name: "On Track", value: byStatus.green.length, color: "#10b981" },
                ]}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={20}
                outerRadius={35}
              >
                {[
                  { name: "At Risk", value: byStatus.red.length, color: "#ef4444" },
                  { name: "Attention", value: byStatus.amber.length, color: "#f59e0b" },
                  { name: "On Track", value: byStatus.green.length, color: "#10b981" },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resource Distribution Chart */}
      {analytics.projectLoad.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold mb-3">Resource Distribution by Project</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.projectLoad}>
              <XAxis dataKey="project" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="tasks" fill="#6366f1" name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Assignee Workload Chart */}
      {analytics.assigneeLoad.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <h3 className="font-semibold mb-3">Assignee Workload</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analytics.assigneeLoad}>
              <XAxis dataKey="assignee" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="load" fill="#8b5cf6" name="Total Tasks" />
              <Bar dataKey="atRisk" fill="#ef4444" name="At Risk" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid md:grid-cols-3 gap-3">
          {STATUS_COLS.map((col) => (
            <div key={col.id} id={col.id} className="rounded-xl border bg-white">
              <div className="px-3 py-2 border-b flex items-center justify-between">
                <div className="font-medium">{col.title}</div>
                <div className="text-xs text-gray-500">{byStatus[col.id].length}</div>
              </div>
              <div className="p-2 min-h-[300px]" id={col.id}>
                {(byStatus[col.id] ?? []).map((t) => (
                  <div
                    key={t.id}
                    id={t.id}
                    className={`mb-2 rounded-lg border-2 ${projectColor(t.projectId)} bg-gray-50 p-3 hover:bg-gray-100`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate">{t.name}</div>
                      {t.projectId && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white border text-gray-700">{t.projectId}</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-gray-600 flex items-center gap-2">
                      {t.assignee && <span>👤 {t.assignee}</span>}
                      {t.due && <span>📅 {t.due}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
