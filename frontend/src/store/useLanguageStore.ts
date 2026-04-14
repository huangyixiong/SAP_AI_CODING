import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../i18n/locales';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'zh-CN',
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'language-storage', // localStorage key
    }
  )
);
