// crypto.ts targets the browser `window` global; Node's Web Crypto API lives on
// globalThis, so alias it here to keep the source unit-testable without jsdom.
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}

// The app defaults to English; tests assert the Portuguese source strings
import { setLang } from '../lib/i18n';
setLang('pt');
