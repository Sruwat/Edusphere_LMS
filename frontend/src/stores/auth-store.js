import { create } from 'zustand';

function isStorageBlockedError(error) {
  if (!error) return false;
  const message = String(error.message || error);
  return message.includes('Access is denied') || message.includes('storage') || message.includes('Storage');
}

function readStoredUser() {
  try {
    const savedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    if (!isStorageBlockedError(error)) console.warn('Failed to read stored user', error);
    return null;
  }
}

export const useAuthStore = create((set) => ({
  user: readStoredUser(),
  loading: false,
  setUser: (user) => {
    try {
      if (user) localStorage.setItem('user', JSON.stringify(user));
      else localStorage.removeItem('user');
    } catch (error) {
      if (!isStorageBlockedError(error)) console.warn('Failed to persist user', error);
    }
    set({ user });
  },
  setLoading: (loading) => set({ loading }),
  hydrateUser: () => set({ user: readStoredUser() }),
}));

