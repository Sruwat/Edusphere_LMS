import { create } from 'zustand';

export const useUiStore = create((set) => ({
  notificationsOpen: false,
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
}));

