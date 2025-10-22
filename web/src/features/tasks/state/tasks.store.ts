import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RAG = "green"|"amber"|"red"
export type Priority = "Low"|"Med"|"High"
export type Section = "Pre-Prod"|"Production"|"QC"|"Dispatch"

export type Task = {
  id: string;
  name: string;
  section: Section;
  status: RAG;
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

type State = {
  sections: Section[];
  tasks: Task[];
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

  clearSelection: () => void;
  toggleSelect: (id: string) => void;
  selectMany: (ids: string[], on: boolean) => void;

  setDrawerTask: (id: string | null) => void;

  setFilters: (patch: Partial<TaskFilters>) => void;
  resetFilters: () => void;
}

const initialTasks: Task[] = [
  { id:'T-001', name:'Finalize PPS', section:'Pre-Prod', status:'green', assignee:'Vinod', due:'2025-10-12', priority:'High', tags:['PPS'], updatedAt:'2025-10-05' },
  { id:'T-002', name:'Paint batch #12', section:'Production', status:'amber', assignee:'Team A', due:'2025-10-14', priority:'Med', tags:['Paint'], updatedAt:'2025-10-05' },
  { id:'T-003', name:'QC for lot #7', section:'QC', status:'green', assignee:'QA-1', due:'2025-10-15', priority:'Med', tags:['QC'], updatedAt:'2025-10-05' },
  { id:'T-004', name:'Pack & dispatch #5', section:'Dispatch', status:'red', assignee:'Ops', due:'2025-10-16', priority:'High', tags:['Pack'], updatedAt:'2025-10-05' },
]

export const useTasks = create<State & Actions>()(persist(
  (set, get) => ({
    sections: ['Pre-Prod','Production','QC','Dispatch'],
    tasks: initialTasks,
    selection: [],
    drawerTaskId: null,
    filters: { section:'All', assignee:'All', status:'All', tag:'All' },

    addTask: (t) => set({ tasks: [t, ...get().tasks] }),
    updateTask: (id, patch) => set({ tasks: get().tasks.map(x => x.id===id ? { ...x, ...patch, updatedAt: new Date().toISOString().slice(0,10) } : x) }),
    deleteTasks: (ids) => set({ tasks: get().tasks.filter(x => !ids.includes(x.id)) }),
    moveTaskToSection: (id, section) => set({ tasks: get().tasks.map(x => x.id===id ? { ...x, section } : x) }),
    reorderWithinSection: (idsInOrder, section) => {
      const inCol = get().tasks.filter(t => t.section===section).sort((a,b)=>idsInOrder.indexOf(a.id)-idsInOrder.indexOf(b.id))
      const others = get().tasks.filter(t => t.section!==section)
      set({ tasks: [...others, ...inCol] })
    },

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
  }),
  { 
    name: "pms-tasks",
    // Migrate old Set-based selection to array
    migrate: (persistedState: any, version: number) => {
      if (persistedState && persistedState.selection && !Array.isArray(persistedState.selection)) {
        // Old state had Set, convert to array
        persistedState.selection = [];
      }
      return persistedState as State & Actions;
    },
  }
))
