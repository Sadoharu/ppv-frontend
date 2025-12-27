// src/utils/format-old.ts
export const dt = (v?: string | number | Date) =>
  v ? new Date(v).toLocaleString() : ''
