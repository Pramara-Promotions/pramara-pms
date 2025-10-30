import { useState } from "react";
import { X, Settings, Palette, AlertCircle } from "lucide-react";
import { Section, useTasks } from "../state/tasks.store";

interface ColumnCustomizationModalProps {
  columnId: Section;
  onClose: () => void;
}

export default function ColumnCustomizationModal({ columnId, onClose }: ColumnCustomizationModalProps) {
  const { columns, updateColumn } = useTasks();
  const column = columns.find(c => c.id === columnId);
  
  const [title, setTitle] = useState(column?.title || "");
  const [color, setColor] = useState(column?.color || "#6366f1");
  const [wipLimit, setWipLimit] = useState(column?.wipLimit?.toString() || "");

  if (!column) return null;

  function handleSave() {
    if (!column) return;
    updateColumn(columnId, {
      title: title.trim() || column.title,
      color,
      wipLimit: wipLimit ? parseInt(wipLimit) : undefined,
    });
    onClose();
  }

  const presetColors = [
    "#6366f1", // indigo
    "#8b5cf6", // purple
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#3b82f6", // blue
    "#ec4899", // pink
    "#14b8a6", // teal
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600 dark:text-neutral-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Customize Column
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Column Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Column Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="e.g., In Progress"
            />
          </div>

          {/* Column Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Column Color
              </div>
            </label>
            <div className="grid grid-cols-8 gap-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="mt-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* WIP Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                WIP Limit (Optional)
              </div>
            </label>
            <input
              type="number"
              value={wipLimit}
              onChange={(e) => setWipLimit(e.target.value)}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Leave empty for no limit"
            />
            <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
              Warning appears when task count exceeds this limit
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-lg transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
