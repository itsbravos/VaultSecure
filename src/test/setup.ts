// crypto.ts targets the browser `window` global; Node's Web Crypto API lives on
// globalThis, so alias it here to keep the source unit-testable without jsdom.
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}
