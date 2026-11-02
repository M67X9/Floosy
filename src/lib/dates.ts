import { T, type Lang } from './i18n';

// All dates are ISO "YYYY-MM-DD" strings in Kuwait time (Asia/Kuwait, UTC+3).
export function todayISO(): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuwait', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const g = (k: string) => parts.find((p) => p.type === k)!.value;
    return g('year') + '-' + g('month') + '-' + g('day');
  } catch {
    return new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  }
}

export function kuwaitHour(): number {
  try {
    return +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuwait', hour: '2-digit', hourCycle: 'h23' }).format(new Date());
  } catch {
    return new Date(Date.now() + 3 * 3600e3).getUTCHours();
  }
}

export const D = (iso: string) => new Date(iso + 'T00:00:00Z');
export function addDays(iso: string, n: number) { const d = D(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function addMonths(ym: string, n: number) { const d = D(ym + '-01'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); }
export function daysIn(ym: string) { const d = D(ym + '-01'); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return d.getUTCDate(); }

export function fmtDate(lang: Lang, iso: string, opts: Intl.DateTimeFormatOptions) {
  const loc = lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB';
  return new Intl.DateTimeFormat(loc, { timeZone: 'UTC', ...opts }).format(D(iso));
}

export function relLabel(lang: Lang, iso: string, today: string) {
  const t = T[lang];
  if (iso === today) return t.today;
  if (iso === addDays(today, -1)) return t.yesterday;
  if (iso === addDays(today, 1)) return t.tomorrow;
  const o: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  if (iso.slice(0, 4) !== today.slice(0, 4)) o.year = 'numeric';
  return fmtDate(lang, iso, o);
}

export function friendly(lang: Lang, iso: string, today: string) {
  const t = T[lang];
  const rel = iso === today ? t.today : iso === addDays(today, -1) ? t.yesterday : iso === addDays(today, 1) ? t.tomorrow : fmtDate(lang, iso, { weekday: 'long' });
  return rel + (lang === 'ar' ? '، ' : ', ') + fmtDate(lang, iso, { day: 'numeric', month: 'long', year: 'numeric' });
}

export const shortDate = (lang: Lang, iso: string) => fmtDate(lang, iso, { day: 'numeric', month: 'short' });
