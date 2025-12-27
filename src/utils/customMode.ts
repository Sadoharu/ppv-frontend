// src/utils/customMode.ts
export type CustomModeCanon = 'none' | 'html' | 'sandbox'

// те, з чим працює UI/форма
export function canonicalizeCustomMode(x?: string | null): CustomModeCanon {
  const v = (x || '').toLowerCase()
  if (v === 'sandbox' || v === 'safe') return 'sandbox' // історичний аліас
  if (v === 'html' || v === 'iframe') return 'html'     // історичний аліас
  return 'none'
}

// з форми → у бекенд
export const mapCustomModeOut: Record<string, CustomModeCanon> = {
  none: 'none',
  html: 'html',
  sandbox: 'sandbox',
  safe: 'sandbox',   // АЛІАС (історичне)
  iframe: 'html',    // АЛІАС (історичне)
}
