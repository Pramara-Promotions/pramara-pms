import { useEffect, useState } from "react";
import TaskListView from "../features/tasks/TaskListView";
import TaskBoardView from "../features/tasks/TaskBoardView";
import FilterBar from "../features/common/FilterBar";
import { useSavedViews } from "../features/tasks/state/savedViews.store";
import { useTasks } from "../features/tasks/state/tasks.store";

export default function TasksPage() {
  const [mode, setMode] = useState<"list" | "board">("list");
  const { views, applyView } = useSavedViews();
  const { loadFromServer } = useTasks()

  // Load tasks on first mount (global list for now)
  useEffect(() => {
    loadFromServer().catch(()=>{})
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Tasks</h1>
        <div className="flex items-center gap-2">
          <select
            className="border rounded-lg px-2 py-1.5 text-sm"
            onChange={(e)=> applyView(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Saved views…</option>
            {views.map(v => <option key={v.id} value={v.id}>{v.name}{v.default ? " • default" : ""}</option>)}
          </select>
          <button
            className={`border rounded-lg px-3 py-1.5 text-sm ${mode === "list" ? "bg-gray-100" : ""}`}
            onClick={() => setMode("list")}
          >
            List
          </button>
          <button
            className={`border rounded-lg px-3 py-1.5 text-sm ${mode === "board" ? "bg-gray-100" : ""}`}
            onClick={() => setMode("board")}
          >
            Board
          </button>
        </div>
      </div>

      <FilterBar />

      {mode === "list" ? <TaskListView /> : <TaskBoardView />}
    </div>
  );
}
