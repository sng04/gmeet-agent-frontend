const state = {
  currentProject: null,
  sidebarCollapsed: false,
  liveSession: null,
};

const listeners = new Set();

export const appStore = {
  getState: () => ({ ...state }),

  subscribe: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  setCurrentProject: (project) => {
    state.currentProject = project;
    listeners.forEach(fn => fn(state));
  },

  toggleSidebar: () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    listeners.forEach(fn => fn(state));
  },

  setSidebarCollapsed: (collapsed) => {
    state.sidebarCollapsed = collapsed;
    listeners.forEach(fn => fn(state));
  },

  setLiveSession: (session) => {
    state.liveSession = session;
    listeners.forEach(fn => fn(state));
  },
};
