import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RAG = "green"|"amber"|"red"
export type Priority = "Low"|"Med"|"High"
export type Section = "Pre-Prod"|"Production"|"QC"|"Dispatch"

export type ColumnConfig = {
  id: Section;
  title: string;
  color?: string;
  wipLimit?: number;
  order: number;
}

export type Task = {
  id: string;
  name: string;
  section: Section;
  status: RAG;
  projectId?: string;
  assignee?: string;
  due?: string; // ISO date
  priority?: Priority;
  tags?: string[];
  attachments?: number;
  updatedAt?: string;
}

export type TaskFilters = {
  projectId?: string;
  section?: Section | "All";
  assignee?: string | "All";
  status?: RAG | "All";
  tag?: string | "All";
  from?: string; // ISO
  to?: string;   // ISO
  q?: string;
}

export type ActivityType =
  | "created"
  | "updated"
  | "status-changed"
  | "moved-section"
  | "comment"
  | "attachment";

export type ActivityItem = {
  id: string;
  taskId: string;
  type: ActivityType;
  message: string;
  actor?: string;
  at: string; // ISO timestamp
};

export type Subtask = {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

type State = {
  sections: Section[];
  columns: ColumnConfig[];
  tasks: Task[];
  activities: ActivityItem[];
  subtasks: Subtask[];
  selection: string[]; // Array instead of Set for persist compatibility
  drawerTaskId: string | null;
  filters: TaskFilters;
}

type Actions = {
  addTask: (t: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTasks: (ids: string[]) => void;
  moveTaskToSection: (id: string, section: Section) => void;
  reorderWithinSection: (idsInOrder: string[], section: Section) => void;

  // Column management
  updateColumn: (id: Section, patch: Partial<ColumnConfig>) => void;
  reorderColumns: (columnOrder: Section[]) => void;

  clearSelection: () => void;
  toggleSelect: (id: string) => void;
  selectMany: (ids: string[], on: boolean) => void;

  setDrawerTask: (id: string | null) => void;

  setFilters: (patch: Partial<TaskFilters>) => void;
  resetFilters: () => void;

  // Activity feed
  logActivity: (item: Omit<ActivityItem, "id" | "at"> & { at?: string }) => void;
  getActivitiesFor: (taskId: string) => ActivityItem[];

  // Subtasks
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (id: string) => void;
  deleteSubtask: (id: string) => void;
  getSubtasksFor: (taskId: string) => Subtask[];
}

const initialTasks: Task[] = [
  { id:'T-001', name:'Finalize PPS',        section:'Pre-Prod', status:'green', projectId:'P-001', assignee:'Vinod', due:'2025-10-12', priority:'High', tags:['PPS'],   updatedAt:'2025-10-05' },
  { id:'T-002', name:'Paint batch #12',      section:'Production', status:'amber', projectId:'P-002', assignee:'Team A', due:'2025-10-14', priority:'Med',  tags:['Paint'], updatedAt:'2025-10-05' },
  { id:'T-003', name:'QC for lot #7',        section:'QC',        status:'green', projectId:'P-001', assignee:'QA-1', due:'2025-10-15', priority:'Med',  tags:['QC'],    updatedAt:'2025-10-05' },
  { id:'T-004', name:'Pack & dispatch #5',   section:'Dispatch',  status:'red',   projectId:'P-003', assignee:'Ops',  due:'2025-10-16', priority:'High', tags:['Pack'],  updatedAt:'2025-10-05' },
]

const initialColumns: ColumnConfig[] = [
  { id: 'Pre-Prod', title: 'Pre-Prod', order: 0, color: '#6366f1' },
  { id: 'Production', title: 'Production', order: 1, color: '#8b5cf6' },
  { id: 'QC', title: 'QC', order: 2, color: '#10b981' },
  { id: 'Dispatch', title: 'Dispatch', order: 3, color: '#f59e0b' },
];

export const useTasks = create<State & Actions>()(persist(
  (set, get) => ({
    sections: ['Pre-Prod','Production','QC','Dispatch'],
    columns: initialColumns,
    tasks: initialTasks,
    activities: [],
    subtasks: [],
    selection: [],
    drawerTaskId: null,
    filters: { section:'All', assignee:'All', status:'All', tag:'All' },

    addTask: (t) => {
      const now = new Date().toISOString();
      set({ tasks: [t, ...get().tasks] });
      get().logActivity({ taskId: t.id, type: 'created', message: `Task ${t.name} created`, at: now });
    },
    updateTask: (id, patch) => {
      const before = get().tasks.find(x => x.id === id);
      set({ tasks: get().tasks.map(x => x.id===id ? { ...x, ...patch, updatedAt: new Date().toISOString().slice(0,10) } : x) });
      const after = get().tasks.find(x => x.id === id);
      if (before && after) {
        const changed: string[] = [];
        Object.keys(patch).forEach(k => {
          const key = k as keyof Task;
          if (before[key] !== after[key]) changed.push(k);
        });
        if (changed.length) {
          get().logActivity({ taskId: id, type: 'updated', message: `Updated: ${changed.join(', ')}` });
        }
      }
    },
    deleteTasks: (ids) => set({ tasks: get().tasks.filter(x => !ids.includes(x.id)) }),
    moveTaskToSection: (id, section) => {
      const prev = get().tasks.find(t => t.id === id)?.section;
      set({ tasks: get().tasks.map(x => x.id===id ? { ...x, section } : x) });
      get().logActivity({ taskId: id, type: 'moved-section', message: `Moved from ${prev} to ${section}` });
    },
    reorderWithinSection: (idsInOrder, section) => {
      const inCol = get().tasks.filter(t => t.section===section).sort((a,b)=>idsInOrder.indexOf(a.id)-idsInOrder.indexOf(b.id))
      const others = get().tasks.filter(t => t.section!==section)
      set({ tasks: [...others, ...inCol] })
    },

    updateColumn: (id, patch) => set({ 
      columns: get().columns.map(c => c.id === id ? { ...c, ...patch } : c) 
    }),
    reorderColumns: (columnOrder) => set({
      columns: get().columns
        .map(c => ({ ...c, order: columnOrder.indexOf(c.id) }))
        .sort((a, b) => a.order - b.order)
    }),

    clearSelection: () => set({ selection: [] }),
    toggleSelect: (id) => {
      const sel = get().selection
      const next = sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]
      set({ selection: next })
    },
    selectMany: (ids, on) => {
      const sel = get().selection
      const next = on ? [...new Set([...sel, ...ids])] : sel.filter(x => !ids.includes(x))
      set({ selection: next })
    },

    setDrawerTask: (id) => set({ drawerTaskId: id }),

    setFilters: (patch) => set({ filters: { ...get().filters, ...patch } }),
    resetFilters: () => set({ filters: { section:'All', assignee:'All', status:'All', tag:'All', projectId: undefined, from: undefined, to: undefined, q: '' } }),

    // Activity feed
    logActivity: (item) => set({
      activities: [
        {
          id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          at: item.at || new Date().toISOString(),
          ...item,
        },
        ...get().activities,
      ],
    }),
    getActivitiesFor: (taskId) => get().activities.filter(a => a.taskId === taskId),

    // Subtasks
    addSubtask: (taskId, title) => set({
      subtasks: [
        {
          id: `ST-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          taskId,
          title,
          completed: false,
          createdAt: new Date().toISOString(),
        },
        ...get().subtasks,
      ],
    }),
    toggleSubtask: (id) => set({
      subtasks: get().subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s),
    }),
    deleteSubtask: (id) => set({ subtasks: get().subtasks.filter(s => s.id !== id) }),
    getSubtasksFor: (taskId) => get().subtasks.filter(s => s.taskId === taskId),
  }),
  { 
    name: "pms-tasks",
    // Migrate old Set-based selection to array
    migrate: (persistedState: any, version: number) => {
      if (persistedState && persistedState.selection && !Array.isArray(persistedState.selection)) {
        // Old state had Set, convert to array
        persistedState.selection = [];
      }
      // Ensure columns exist
      if (persistedState && !persistedState.columns) {
        persistedState.columns = initialColumns;
      }
      // Seed new arrays if missing
      if (persistedState && !persistedState.activities) {
        (persistedState as any).activities = [];
      }
      if (persistedState && !persistedState.subtasks) {
        (persistedState as any).subtasks = [];
      }
      return persistedState as State & Actions;
    },
  }
))
