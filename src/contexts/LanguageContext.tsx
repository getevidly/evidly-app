import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  type Locale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  translations,
  getTranslation,
} from '../lib/i18n';

// TODO: Persist language preference in Supabase user profile
// TODO: Email/SMS notification templates should respect user language (Resend/Twilio)

const STORAGE_KEY = 'evidly_locale';

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      return stored as Locale;
    }
  } catch { /* SSR / incognito */ }
  return DEFAULT_LOCALE;
}

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translate a dot-separated key, e.g. t('nav.dashboard') */
  t: (key: string) => string;
  /** Get a whole section object for batch access, e.g. ts('common') */
  ts: <S extends keyof typeof translations['en']>(section: S) => (typeof translations)['en'][S];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try { localStorage.setItem(STORAGE_KEY, newLocale); } catch { /* noop */ }
  }, []);

  const t = useCallback(
    (key: string) => getTranslation(locale, key),
    [locale],
  );

  const ts = useCallback(
    <S extends keyof typeof translations['en']>(section: S) => {
      const data = translations[locale]?.[section];
      return (data ?? translations.en[section]) as (typeof translations)['en'][S];
    },
    [locale],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, ts }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within a LanguageProvider');
  return ctx;
}
