// src/utils/apiBase.ts
export function getApiBase() {
  return (import.meta.env.VITE_API_BASE?.trim() || window.location.origin).replace(/\/+$/, '')
}
