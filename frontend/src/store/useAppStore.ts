import { create } from 'zustand';

export interface SAPInfo {
  connected: boolean;
  url: string;
  host: string;
  user: string;
  client: string;
  language: string;
  lastCheck: string | null;
}

interface AppState {
  sap: SAPInfo;
  setSAPInfo: (info: Partial<SAPInfo>) => void;
}

const defaultSAP: SAPInfo = {
  connected: false,
  url: '',
  host: '',
  user: '',
  client: '',
  language: '',
  lastCheck: null,
};

export const useAppStore = create<AppState>()((set) => ({
  sap: defaultSAP,

  setSAPInfo: (info) =>
    set((state) => ({
      sap: { ...state.sap, ...info },
    })),
}));

// Helper getters for convenience
export const useSAPConnected = () => useAppStore((state) => state.sap.connected);
export const useSAPUrl = () => useAppStore((state) => state.sap.url);
export const useSAPInfo = () => useAppStore((state) => state.sap);
