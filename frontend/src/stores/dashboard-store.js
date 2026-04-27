import { create } from 'zustand';

export const useDashboardStore = create((set) => ({
  filters: {
    courseSearch: '',
    librarySearch: '',
    selectedGameCategory: 'all',
  },
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),
}));

