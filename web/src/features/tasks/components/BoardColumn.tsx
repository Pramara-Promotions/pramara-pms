import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Settings2, AlertTriangle } from "lucide-react";
import BoardCard from "./BoardCard";
import { Task } from "../state/tasks.store";

interface BoardColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
  wipLimit?: number;
  onSettings?: () => void;
}

export default function BoardColumn({ id, title, tasks, color, wipLimit, onSettings }: BoardColumnProps) {
  const taskCount = tasks.length;
  const isOverLimit = wipLimit !== undefined && taskCount > wipLimit;
  const isNearLimit = wipLimit !== undefined && taskCount === wipLimit;

  return (
    <div className="rounded-2xl border p-3 bg-white min-h-[60vh]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color || "#6366f1" }}
          />
          <div className="text-sm font-semibold">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          {wipLimit !== undefined && (
            <div
              className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
                isOverLimit
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : isNearLimit
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {isOverLimit && <AlertTriangle className="w-3 h-3" />}
              {taskCount}/{wipLimit}
            </div>
          )}
          {!wipLimit && <div className="text-xs text-gray-500">{taskCount}</div>}
          {onSettings && (
            <button
              onClick={onSettings}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              title="Column settings"
            >
              <Settings2 className="w-4 h-4 text-gray-400 dark:text-neutral-500" />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <BoardCard key={t.id} task={t} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
