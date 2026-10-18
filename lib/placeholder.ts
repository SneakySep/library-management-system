/**
 * Local, dependency-free cover placeholder.
 * Rendered as an inline SVG data URI so it loads instantly (and works offline)
 * instead of relying on an external placeholder service.
 */
export const COVER_FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#e2e8f0"/><stop offset="100%" stop-color="#cbd5e1"/>' +
      '</linearGradient></defs>' +
      '<rect width="300" height="400" fill="url(#g)"/>' +
      '<g fill="none" stroke="#94a3b8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M105 150v110a10 10 0 0 0 10 10h80a10 10 0 0 0 10-10V150"/>' +
      '<path d="M120 130h60v20h-60z"/>' +
      '<path d="M135 195h30M135 215h30"/>' +
      '</g></svg>'
  );
