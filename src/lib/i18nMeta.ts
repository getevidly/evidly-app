// ============================================================
// EvidLY i18n — Lightweight metadata (types, locale list, flags)
// ============================================================
// Separated from i18n.ts so Layout/TopBar can import metadata
// without pulling ~108 KB of translation strings into the main bundle.
// ============================================================

export type Locale = 'en' | 'es';

export interface LocaleMeta {
  label: string;      // Display name in that language
  flag: string;       // Emoji flag
  dir: 'ltr' | 'rtl'; // Text direction (RTL support ready)
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { label: 'English', flag: '🇺🇸', dir: 'ltr' },
  es: { label: 'Español', flag: '🇪🇸', dir: 'ltr' },
};

export const SUPPORTED_LOCALES = Object.keys(LOCALE_META) as Locale[];
export const DEFAULT_LOCALE: Locale = 'en';
