import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Clock,
  Star,
  X,
  ChevronRight,
  CheckSquare,
  FolderKanban,
  Users,
  Package,
  Hammer,
  FileText,
  Filter,
  Calendar,
  User,
  Flag,
  Tag,
  Plus,
  Trash2,
  Settings,
} from 'lucide-react';
import { useTasks } from '../tasks/state/tasks.store';

interface SearchResult {
  type: 'task' | 'project' | 'person' | 'batch' | 'station' | 'document';
  id: string;
  title: string;
  subtitle: string;
  metadata: any;
  relevance: number;
  url: string;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  scope: string[];
  filters: any;
  createdAt: string;
}

interface RecentSearch {
  id: string;
  query: string;
  scope: string[];
  resultsCount: number;
  createdAt: string;
}

type Scope = 'all' | 'tasks' | 'projects' | 'people' | 'batches' | 'stations' | 'documents';

const scopeConfig = {
  all: { label: 'All', icon: Search, color: 'text-gray-600' },
  tasks: { label: 'Tasks', icon: CheckSquare, color: 'text-blue-600' },
  projects: { label: 'Projects', icon: FolderKanban, color: 'text-purple-600' },
  people: { label: 'People', icon: Users, color: 'text-green-600' },
  batches: { label: 'Batches', icon: Package, color: 'text-orange-600' },
  stations: { label: 'Stations', icon: Hammer, color: 'text-indigo-600' },
  documents: { label: 'Documents', icon: FileText, color: 'text-red-600' },
};

export default function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const { addTask } = useTasks();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: '',
    status: '',
    assignee: '',
    project: '',
    priority: '',
    tags: '',
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load recent and saved searches on mount
  useEffect(() => {
    if (open) {
      loadRecentSearches();
      loadSavedSearches();
      inputRef.current?.focus();
    }
  }, [open]);

  // Perform search when query or scope changes
  useEffect(() => {
    if (query.trim().length > 0) {
      performSearch();
    } else {
      setResults([]);
      setCounts({});
    }
  }, [query, scope, filters]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        handleResultClick(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, results]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  async function loadRecentSearches() {
    try {
      const response = await fetch('/api/search/recent', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRecentSearches(data);
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  }

  async function loadSavedSearches() {
    try {
      const response = await fetch('/api/search/saved', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSavedSearches(data);
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  }

  async function performSearch() {
    setLoading(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query,
          scope: scope === 'all' ? ['all'] : [scope],
          filters: Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== '')
          ),
          page: 1,
          limit: 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        setCounts(data.counts);
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveCurrentSearch() {
    const name = prompt('Name this search:');
    if (!name) return;

    try {
      const response = await fetch('/api/search/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          query,
          scope: scope === 'all' ? ['all'] : [scope],
          filters,
        }),
      });

      if (response.ok) {
        loadSavedSearches();
        alert('Search saved!');
      }
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  }

  async function deleteSavedSearch(id: string) {
    if (!confirm('Delete this saved search?')) return;

    try {
      const response = await fetch(`/api/search/saved/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        loadSavedSearches();
      }
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  }

  function runSavedSearch(saved: SavedSearch) {
    setQuery(saved.query);
    setScope((saved.scope[0] as Scope) || 'all');
    setFilters(saved.filters || {});
    setShowSaved(false);
  }

  function runRecentSearch(recent: RecentSearch) {
    setQuery(recent.query);
    setScope((recent.scope[0] as Scope) || 'all');
  }

  function handleResultClick(result: SearchResult) {
    // In a real app, navigate to the URL
    console.log('Navigate to:', result.url);
    onOpenChange(false);
  }

  function createTaskQuick() {
    if (!query.trim()) return;
    const id = `T-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    addTask({
      id,
      name: query,
      section: 'Pre-Prod',
      status: 'green',
      priority: 'Med',
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    onOpenChange(false);
  }

  function getResultIcon(type: string) {
    return scopeConfig[type as Scope]?.icon || Search;
  }

  function getResultColor(type: string) {
    return scopeConfig[type as Scope]?.color || 'text-gray-600';
  }

  // Quick stage view suggestion
  const STAGES = ['Pre-Prod', 'Production', 'QC', 'Dispatch'];
  const normalized = query.trim().toLowerCase();
  const matchedStage = normalized ? STAGES.find(s => s.toLowerCase().startsWith(normalized)) : null;
  function goToStage(stage: string) {
    window.location.href = `/stages/${encodeURIComponent(stage)}`;
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="mx-auto mt-20 w-[95vw] max-w-3xl rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl animate-slide-in-down"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Search Input */}
        <div className="border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center gap-3 px-4 py-3">
            <Search className="w-5 h-5 text-gray-400 dark:text-neutral-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, projects, people, batches..."
              className="flex-1 outline-none text-base bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500"
            />
            {loading && (
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors ${
                showFilters ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-400'
              }`}
              title="Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            {query && (
              <button
                onClick={saveCurrentSearch}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-400 dark:text-neutral-500 hover:text-yellow-500"
                title="Save search"
              >
                <Star className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Scope Tabs */}
          <div className="flex items-center gap-1 px-4 pb-3 overflow-x-auto">
            {Object.entries(scopeConfig).map(([key, config]) => {
              const Icon = config.icon;
              const count = counts[key === 'all' ? 'total' : key] || 0;
              const isActive = scope === key;

              return (
                <button
                  key={key}
                  onClick={() => setScope(key as Scope)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700'
                    }
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{config.label}</span>
                  {query && count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-neutral-700'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="px-4 pb-3 space-y-2 border-t border-gray-200 dark:border-neutral-700 pt-3 animate-slide-in-down">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Date"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Status"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.assignee}
                    onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Assignee"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.project}
                    onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Project"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.priority}
                    onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Priority"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.tags}
                    onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Tags"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results / Recent / Saved */}
        <div className="max-h-[60vh] overflow-y-auto" ref={resultsRef}>
          {!query.trim() ? (
            <div className="p-4 space-y-4">
              {/* Saved Searches */}
              {savedSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-neutral-500 uppercase tracking-wide flex items-center gap-2">
                      <Star className="w-3.5 h-3.5" />
                      Saved Searches
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {savedSearches.map((saved) => (
                      <div
                        key={saved.id}
                        className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                        onClick={() => runSavedSearch(saved)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {saved.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-neutral-500">
                              {saved.query} · {saved.scope.join(', ')}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedSearch(saved.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-neutral-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Recent Searches
                  </h3>
                  <div className="space-y-1">
                    {recentSearches.map((recent) => (
                      <div
                        key={recent.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                        onClick={() => runRecentSearch(recent)}
                      >
                        <Clock className="w-4 h-4 text-gray-400 dark:text-neutral-500" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 dark:text-white">{recent.query}</p>
                          <p className="text-xs text-gray-500 dark:text-neutral-500">
                            {recent.resultsCount} results · {recent.scope.join(', ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {savedSearches.length === 0 && recentSearches.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 dark:text-neutral-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-neutral-500">
                    Start typing to search across all projects
                  </p>
                  <p className="text-xs text-gray-400 dark:text-neutral-600 mt-1">
                    Tasks, Projects, People, Batches, Stations, Documents
                  </p>
                </div>
              )}
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center space-y-3">
              <Search className="w-12 h-12 text-gray-300 dark:text-neutral-700 mx-auto mb-3" />
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                No results found for "{query}"
              </p>
              {matchedStage && (
                <button
                  onClick={() => goToStage(matchedStage)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
                >
                  <FolderKanban className="w-4 h-4" />
                  View all {matchedStage} across projects
                </button>
              )}
              {scope === 'tasks' && (
                <button
                  onClick={createTaskQuick}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create task "{query}"
                </button>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {matchedStage && (
                <div
                  onClick={() => goToStage(matchedStage)}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer border hover:bg-gray-50 dark:hover:bg-neutral-800/50"
                >
                  <FolderKanban className="w-4 h-4" />
                  <div className="text-sm">
                    View all <span className="font-medium">{matchedStage}</span> across projects
                  </div>
                </div>
              )}
              {results.map((result, index) => {
                const Icon = getResultIcon(result.type);
                const color = getResultColor(result.type);
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                      ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 ring-2 ring-indigo-500/50'
                          : 'hover:bg-gray-50 dark:hover:bg-neutral-800/50'
                      }
                    `}
                  >
                    <div className={`p-2 rounded-lg bg-gray-100 dark:bg-neutral-800 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {result.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-neutral-500 truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.metadata?.status && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400">
                          {result.metadata.status}
                        </span>
                      )}
                      {result.metadata?.priority && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400">
                          {result.metadata.priority}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-neutral-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-neutral-700 px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-neutral-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700">Enter</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700">Esc</kbd>
              Close
            </span>
          </div>
          {results.length > 0 && (
            <span>{results.length} results</span>
          )}
        </div>
      </div>
    </div>
  );
}
