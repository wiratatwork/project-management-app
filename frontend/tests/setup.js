// jsdom provides `CSS.escape` on modern versions, but guard anyway so the
// tests are robust across jsdom releases (table.js uses CSS.escape for
// action-button selectors).
if (typeof globalThis.CSS === 'undefined' || typeof CSS.escape !== 'function') {
  globalThis.CSS = globalThis.CSS || {};
  CSS.escape = (value) =>
    String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `);
}
