import { create } from 'zustand';

type Theme = 'light' | 'dark';

type UiState = {
  theme: Theme;
  sidebarOpen: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
};

const STORAGE_KEY = 'ps.theme';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: 'light',
  sidebarOpen: true,
  setTheme: (t) => {
    applyTheme(t);
    set({ theme: t });
  },
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
}));

/** 클라이언트에서 한 번 호출하여 localStorage → store/theme 동기화 */
export function initTheme() {
  if (typeof window === 'undefined') return;
  const t = readInitialTheme();
  applyTheme(t);
  useUiStore.setState({ theme: t });
}
