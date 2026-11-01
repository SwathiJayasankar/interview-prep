// LLM output is never perfectly clean. These helpers force it into the shape we expect.

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function str(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

// A list of non-empty strings.
export function strList(value, max = 50) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim()).slice(0, max);
}

export function list(value, max = 50) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

export const round1 = (n) => Math.round(n * 10) / 10;

export const average = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

// "2025-03-01" + 3 days = "2025-03-04" (plain strings avoid time zone bugs)
export function addDays(isoDay, days) {
  const d = new Date(`${isoDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
