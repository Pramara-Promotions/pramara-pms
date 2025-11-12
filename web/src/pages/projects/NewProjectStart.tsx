// web/src/pages/projects/NewProjectStart.tsx
import React from 'react';

export default function NewProjectStart() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">New project</h1>

      {/* Left: simple form (name + template choice) */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Project name</label>
            <input className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2" placeholder="e.g., Spring collection" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Start from</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <input type="radio" name="tmpl" defaultChecked /> Use an existing template
              </label>
              <label className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <input type="radio" name="tmpl" /> Create a new template
              </label>
            </div>
          </div>

          <button className="rounded-lg bg-indigo-600 text-white px-3 py-2 hover:bg-indigo-700">
            Continue
          </button>
        </div>

        {/* Right: visual snapshot placeholder */}
        <div className="col-span-2 rounded-xl border p-4 bg-white dark:bg-neutral-900 dark:border-neutral-800">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Project snapshot</div>
          <div className="h-64 rounded-md border bg-gray-50 dark:bg-neutral-800 dark:border-neutral-700 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            (High-level snapshot of ongoing projects)
          </div>
        </div>
      </div>
    </div>
  );
}