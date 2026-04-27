import { create } from 'zustand';

export const useGamesStore = create((set) => ({
  preferences: {
    category: 'all',
    difficulty: 'all',
  },
  stats: {
    totalGamesPlayed: 0,
    averageScore: 0,
  },
  setPreference: (key, value) =>
    set((state) => ({
      preferences: {
        ...state.preferences,
        [key]: value,
      },
    })),
  setStats: (stats) => set((state) => ({ stats: { ...state.stats, ...stats } })),
}));

