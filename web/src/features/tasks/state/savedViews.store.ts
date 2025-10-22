import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TaskFilters, useTasks } from "./tasks.store";

export type SavedView = { id: string; name: string; filters: TaskFilters; default?: boolean }

type State = { views: SavedView[] }
type Actions = {
  saveView: (name: string, makeDefault?: boolean) => void;
  applyView: (id: string) => void;
}

export const useSavedViews = create<State & Actions>()(persist(
  (set, get) => ({
    views: [],
    saveView: (name, makeDefault) => {
      const filters = useTasks.getState().filters
      const id = crypto.randomUUID()
      const next = [...get().views.map(v => ({ ...v, default: makeDefault ? false : v.default })), { id, name, filters, default: !!makeDefault }]
      set({ views: next })
    },
    applyView: (id) => {
      const v = get().views.find(x => x.id===id)
      if (!v) return
      useTasks.getState().setFilters(v.filters)
    },
  }),
  { name: "pms-saved-views" }
))
