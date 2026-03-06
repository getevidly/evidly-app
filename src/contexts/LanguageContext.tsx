import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { type Locale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../lib/i18nMeta';
import type { EnTranslations } from '../lib/i18n';

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

// --------------- Lazy translation loading ---------------
// Start loading the heavy i18n translations (~108 KB) at module evaluation time.
// By the time React renders the first component, translations are usually resolved.
// Fallback: t(key) returns the key itself during the brief loading window.

const i18nPromise = import('../lib/i18n');
let _translations: Record<Locale, EnTranslations> | null = null;
let _getTranslation: ((locale: Locale, key: string) => string) | null = null;

i18nPromise.then(mod => {
  _translations = mod.translations as Record<Locale, EnTranslations>;
  _getTranslation = mod.getTranslation;
});

// --------------- Context ---------------

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translate a dot-separated key, e.g. t('nav.dashboard') */
  t: (key: string) => string;
  /** Get a whole section object for batch access, e.g. ts('common') */
  ts: <S extends keyof EnTranslations>(section: S) => EnTranslations[S];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);
  const [, setLoaded] = useState(!!_translations);

  useEffect(() => {
    if (!_translations) {
      i18nPromise.then(() => setLoaded(true));
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try { localStorage.setItem(STORAGE_KEY, newLocale); } catch { /* noop */ }
  }, []);

  const t = useCallback(
    (key: string) => _getTranslation ? _getTranslation(locale, key) : key,
    [locale],
  );

  const ts = useCallback(
    <S extends keyof EnTranslations>(section: S): EnTranslations[S] => {
      if (!_translations) return {} as EnTranslations[S];
      const data = _translations[locale]?.[section];
      return (data ?? _translations.en[section]) as EnTranslations[S];
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
