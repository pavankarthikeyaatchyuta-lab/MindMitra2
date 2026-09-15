import React, { createContext, useContext, useState, ReactNode } from 'react';
import { en } from './en';
import { hi } from './hi';
import { te } from './te';
import { Language } from '../types';

type TranslationKeys = typeof en;
export type TFunction = ((keyPath: string, fallback?: string) => string) & TranslationKeys;

interface I18nContextType {
  t: TFunction;
  language: Language;
  setLanguage: (lang: Language) => void;
}

function createT(translationsObj: any): TFunction {
  const fn = (keyPath: string, fallback?: string): string => {
    if (!keyPath) return fallback || '';
    const parts = keyPath.split('.');
    let current: any = translationsObj;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return fallback || keyPath;
      }
    }
    return typeof current === 'string' ? current : (fallback || keyPath);
  };
  Object.assign(fn, translationsObj);
  return fn as TFunction;
}

const translations: Record<Language, any> = { en, hi, te };

const I18nContext = createContext<I18nContextType>({
  t: createT(en),
  language: 'en',
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem('mindmitra_lang') as Language) || 'en'
  );
  const handleSetLanguage = (lang: Language) => {
    localStorage.setItem('mindmitra_lang', lang);
    setLanguage(lang);
  };

  const t = createT(translations[language] || en);

  return (
    <I18nContext.Provider value={{ t, language, setLanguage: handleSetLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useTranslation = () => useContext(I18nContext);
