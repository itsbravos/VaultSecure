import { EN } from './i18n-en';

// The UI is written in Portuguese; Portuguese source strings are the keys and
// i18n-en.ts maps them to English. Anything missing falls back to Portuguese,
// so an untranslated string shows up as Portuguese text instead of a broken key.

export type Lang = 'pt' | 'en';

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: 'pt', label: 'Português' },
  { id: 'en', label: 'English' },
];

// English until the user picks a language (asked once, right after the first unlock)
export const detectLang = (): Lang => 'en';

let current: Lang = detectLang();

/** Set by App on every render from the saved settings; the tree remounts on change. */
export const setLang = (lang: Lang) => {
  current = lang;
  if (typeof document !== 'undefined') document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
};
export const getLang = (): Lang => current;

/**
 * Translate a Portuguese UI string. `{name}` placeholders are filled from vars,
 * in both languages, so dynamic text keeps one key per sentence.
 */
export function tr(text: string, vars?: Record<string, string | number | undefined | null>): string {
  let out = current === 'en' ? EN[text] ?? text : text;
  if (vars) out = out.replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])));
  return out;
}

/** Locale for dates and numbers. */
export const locale = () => (current === 'en' ? 'en-US' : 'pt-BR');
