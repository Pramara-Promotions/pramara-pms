/**
 * Mobile-Optimized Task List View
 * Full-screen mobile list with filters, search, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { useTasks, Task } from './state/tasks.store';
import { MobileTaskCard } from './components/MobileTaskCard';
import { 
  Search, 
  Filter, 
  Plus, 
  SlidersHorizontal,
  X,
  ChevronDown,
} from 'lucide-react';
import { responsiveClasses, useVhFix, isMobile } from '../../utils/responsive';

export function MobileTaskListView() {
  const { tasks, filters, moveTaskToSection } = useTasks();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');

  // Setup vh fix for mobile browsers
  useEffect(() => {
    const cleanup = useVhFix();
    return cleanup;
  }, []);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    // Search query
    if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Status filter
    if (selectedStatus !== 'All' && task.status !== selectedStatus) {
      return false;
    }
    // Section filter
    if (selectedSection !== 'All' && task.section !== selectedSection) {
      return false;
    }
    return true;
  });

  // Group tasks by section
  const tasksBySection = filteredTasks.reduce((acc, task) => {
    const section = task.section;
    if (!acc[section]) acc[section] = [];
    acc[section].push(task);
    return acc;
    }, {} as Record<string, Task[]>);

  const handleSwipeRight = (task: any) => {
    // Mark as green (completed)
    moveTaskToSection(task.id, task.section);
  };

  const handleSwipeLeft = (task: any) => {
    // Mark as red (at risk)
    moveTaskToSection(task.id, task.section);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Fixed Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 safe-area-top">
        <div className="px-4 py-3">
          {/* Title */}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Tasks
          </h1>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`
                w-full pl-10 pr-10 py-2.5 
                bg-gray-100 dark:bg-gray-700 
                border-0 rounded-xl
                text-gray-900 dark:text-white
                placeholder-gray-500 dark:placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                ${responsiveClasses.button}
              `}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full
                ${showFilters 
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }
                font-medium text-sm whitespace-nowrap
                ${responsiveClasses.button}
              `}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>

            {/* Status Pills */}
            {['All', 'red', 'amber', 'green'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`
                  px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap
                  ${selectedStatus === status
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }
                  ${responsiveClasses.button}
                `}
              >
                {status === 'All' ? 'All' : 
                 status === 'red' ? '🔴 At Risk' :
                 status === 'amber' ? '🟡 Attention' :
                 '🟢 On Track'}
              </button>
            ))}
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3">
              {/* Section Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Section
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className={`
                    w-full px-4 py-2.5 
                    bg-white dark:bg-gray-700 
                    border border-gray-200 dark:border-gray-600 rounded-xl
                    text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-indigo-500
                    ${responsiveClasses.button}
                  `}
                >
                  <option value="All">All Sections</option>
                  <option value="Pre-Prod">Pre-Prod</option>
                  <option value="Production">Production</option>
                  <option value="QC">QC</option>
                  <option value="Dispatch">Dispatch</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {selectedSection === 'All' ? (
          // Grouped by section
          <div className="space-y-6 pb-24">
            {Object.entries(tasksBySection).map(([section, sectionTasks]) => (
              <div key={section}>
                <div className="sticky top-0 z-10 px-4 py-2 bg-gray-100 dark:bg-gray-800">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center justify-between">
                    <span>{section}</span>
                    <span className="text-xs font-normal bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {sectionTasks.length}
                    </span>
                  </h2>
                </div>
                <div className="px-4 space-y-3 mt-3">
                  {sectionTasks.map((task) => (
                    <MobileTaskCard
                      key={task.id}
                      task={task}
                      compact
                      onSwipeRight={handleSwipeRight}
                      onSwipeLeft={handleSwipeLeft}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Single list
          <div className="px-4 py-4 space-y-3 pb-24">
            {filteredTasks.map((task) => (
              <MobileTaskCard
                key={task.id}
                task={task}
                compact
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No tasks found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your filters or search query
            </p>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        className={`
          fixed bottom-20 right-4 z-30
          w-14 h-14 rounded-full
          bg-gradient-to-br from-indigo-600 to-purple-600
          text-white shadow-lg hover:shadow-xl
          flex items-center justify-center
          active:scale-95 transition-transform
          ${responsiveClasses.button}
        `}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Task Count Badge */}
      <div className="fixed bottom-24 left-4 z-30 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>
    </div>
  );
}
