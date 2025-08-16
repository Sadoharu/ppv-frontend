// ISO → значення для <input type="datetime-local">
export function isoToLocalInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 16)
}

// значення <input type="datetime-local"> → ISO у UTC
export function localInputToIso(local?: string) {
  if (!local) return undefined
  const d = new Date(local)
  if (isNaN(d.getTime())) return undefined
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString()
}
