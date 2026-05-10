export function nowIso() {
  return new Date().toISOString();
}

export function addMinutes(timestamp: string, minutes: number) {
  return new Date(Date.parse(timestamp) + minutes * 60_000).toISOString();
}

export function addDays(timestamp: string, days: number) {
  return new Date(Date.parse(timestamp) + days * 24 * 60 * 60_000).toISOString();
}
