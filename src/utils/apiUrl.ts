// src/utils/apiUrl.ts
export function buildApiHref(path: string, opts?: { addApiPrefix?: boolean }) {
  const baseRaw = (import.meta.env.VITE_API_BASE?.trim() || window.location.origin);
  const base = baseRaw.replace(/\/+$/, '');
  // чи закінчується base на /api
  let hasApi = false;
  try {
    const u = new URL(base);
    hasApi = /\/api\/?$/.test(u.pathname || '/');
  } catch {/* no-op */}
  const addApi = opts?.addApiPrefix ?? true;
  const prefix = addApi ? (hasApi ? '' : '/api') : '';
  const tail = path.startsWith('/') ? path : `/${path}`;
  return `${base}${prefix}${tail}`;
}
