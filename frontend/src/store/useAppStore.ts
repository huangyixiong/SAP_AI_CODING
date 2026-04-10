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
  // compat shim used in AppLayout
  sapConnected: boolean;
  sapUrl: string;
  sapLastCheck: string | null;
  setSAPStatus: (connected: boolean, url: string, lastCheck?: string | null) => void;
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

export const useAppStore = create<AppState>((set) => ({
  sap: defaultSAP,
  sapConnected: false,
  sapUrl: '',
  sapLastCheck: null,

  setSAPInfo: (info) =>
    set((state) => ({
      sap: { ...state.sap, ...info },
      sapConnected: info.connected ?? state.sap.connected,
      sapUrl: info.url ?? state.sap.url,
      sapLastCheck: info.lastCheck !== undefined ? info.lastCheck : state.sap.lastCheck,
    })),

  setSAPStatus: (connected, url, lastCheck) =>
    set((state) => ({
      sap: { ...state.sap, connected, url, lastCheck: lastCheck ?? state.sap.lastCheck },
      sapConnected: connected,
      sapUrl: url,
      sapLastCheck: lastCheck ?? state.sap.lastCheck,
    })),
}));
