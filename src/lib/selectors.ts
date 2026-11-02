import { addDays, addMonths, D, daysIn } from './dates';
import { CATS, type Cat, type CatId, type Lang } from './i18n';
import { moneyOf } from './money';
import type { Tx } from './types';

export const sum = (a: { amount: number }[]) => a.reduce((s, x) => s + x.amount, 0);
export const catOf = (id: CatId): Cat => CATS.find((c) => c.id === id) || CATS[9];
export const sortDesc = (a: Tx, b: Tx) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.time !== b.time ? (a.time < b.time ? 1 : -1) : a.id < b.id ? 1 : -1);
export const pctOf = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0) + '%';

export function monthStats(txs: Tx[], today: string) {
  const ym = today.slice(0, 7), dom = +today.slice(8, 10), prevYM = addMonths(ym, -1);
  const past = txs.filter((x) => x.date <= today);
  const monthTx = past.filter((x) => x.date.slice(0, 7) === ym);
  const monthTotal = sum(monthTx);
  const prevSame = sum(past.filter((x) => x.date.slice(0, 7) === prevYM && +x.date.slice(8, 10) <= dom));
  const change = prevSame > 0 ? ((monthTotal - prevSame) / prevSame) * 100 : 0;
  const weekStart = addDays(today, -D(today).getUTCDay());
  return {
    ym, dom, prevYM, past, monthTx, monthTotal, prevSame, change, weekStart,
    todayTotal: sum(past.filter((x) => x.date === today)),
    weekTotal: sum(past.filter((x) => x.date >= weekStart)),
    avgDay: monthTotal / dom,
    dim: daysIn(ym)
  };
}
export type MonthStats = ReturnType<typeof monthStats>;

export type Range = 'week' | 'month' | 'year';
export function breakdown(ms: MonthStats, today: string, range: Range) {
  const start = range === 'week' ? ms.weekStart : range === 'month' ? ms.ym + '-01' : today.slice(0, 4) + '-01-01';
  const rt = ms.past.filter((x) => x.date >= start);
  const tot = sum(rt);
  const byCat = CATS.map((c) => ({ ...c, amt: sum(rt.filter((x) => x.cat === c.id)) })).filter((c) => c.amt > 0).sort((a, b) => b.amt - a.amt);
  return { tot, byCat };
}

export type BudgetKind = 'ok' | 'near' | 'over';
export const budgetKind = (p: number): BudgetKind => (p >= 1 ? 'over' : p >= 0.8 ? 'near' : 'ok');

export type FilterRange = 'all' | '7d' | 'month' | 'last' | 'custom';
export type Sort = 'new' | 'old' | 'high';
export type Filters = { q: string; cat: CatId | 'all'; range: FilterRange; from: string; to: string; sort: Sort };

export function filterTxs(txs: Tx[], f: Filters, today: string) {
  const ym = today.slice(0, 7), prevYM = addMonths(ym, -1);
  let list = txs.slice();
  const q = f.q.trim().toLowerCase();
  if (q) list = list.filter((x) => ((x.en || '') + ' ' + (x.ar || '')).toLowerCase().indexOf(q) >= 0);
  if (f.cat !== 'all') list = list.filter((x) => x.cat === f.cat);
  if (f.range === '7d') { const a = addDays(today, -6); list = list.filter((x) => x.date >= a && x.date <= today); }
  if (f.range === 'month') list = list.filter((x) => x.date.slice(0, 7) === ym);
  if (f.range === 'last') list = list.filter((x) => x.date.slice(0, 7) === prevYM);
  if (f.range === 'custom') { if (f.from) list = list.filter((x) => x.date >= f.from); if (f.to) list = list.filter((x) => x.date <= f.to); }
  list.sort(f.sort === 'new' ? sortDesc : f.sort === 'old' ? (a, b) => -sortDesc(a, b) : (a, b) => b.amount - a.amount || sortDesc(a, b));
  return list;
}

export const CHART_W = 310, CHART_H = 140;

export function insights(txs: Tx[], ms: MonthStats, today: string, income: number, lang: Lang) {
  const money = moneyOf(lang);
  const { past, ym, prevYM, monthTx, monthTotal, avgDay, weekStart } = ms;

  const weeks: { ws: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const ws = addDays(weekStart, -7 * i), we = addDays(ws, 6);
    weeks.push({ ws, total: sum(past.filter((x) => x.date >= ws && x.date <= we)) });
  }
  const W = CHART_W, padX = 6, top = 14, bot = 126;
  const maxWk = Math.max(...weeks.map((w) => w.total), 1) * 1.08;
  const pts = weeks.map((w, i) => [padX + (i * (W - 2 * padX)) / 11, bot - (w.total / maxWk) * (bot - top)]);
  let line = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    line += ' C' + c1[0].toFixed(1) + ',' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ',' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ',' + p2[1].toFixed(1);
  }
  const lastP = pts[pts.length - 1];
  const area = line + ' L' + lastP[0].toFixed(1) + ',' + bot + ' L' + pts[0][0].toFixed(1) + ',' + bot + ' Z';
  const fullWeeks = weeks.slice(0, 11);

  const months: { m: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) { const m = addMonths(ym, -i); months.push({ m, total: sum(past.filter((x) => x.date.slice(0, 7) === m)) }); }
  const maxM = Math.max(...months.map((m) => m.total), 1);

  const highTx = monthTx.slice().sort((a, b) => b.amount - a.amount)[0];
  const prevTotal = sum(past.filter((x) => x.date.slice(0, 7) === prevYM));
  const prevAvg = prevTotal / daysIn(prevYM);
  const avgDiff = prevAvg > 0 ? ((avgDay - prevAvg) / prevAvg) * 100 : 0;

  const r30 = past.filter((x) => x.date >= addDays(today, -29));
  const top5 = CATS.map((c) => ({ ...c, amt: sum(r30.filter((x) => x.cat === c.id)) })).filter((c) => c.amt > 0).sort((a, b) => b.amt - a.amt).slice(0, 5);
  const maxC = top5.length ? top5[0].amt : 1;

  const topMonth = CATS.map((c) => ({ c, amt: sum(monthTx.filter((x) => x.cat === c.id)) })).filter((x) => x.amt > 0).sort((a, b) => b.amt - a.amt)[0];
  const ar = lang === 'ar';
  const sentences: string[] = [];
  if (topMonth) sentences.push(ar ? topMonth.c.ar + ' هي أكبر فئة هذا الشهر بنسبة ' + pctOf(topMonth.amt, monthTotal) + ' من مصروفاتك.' : topMonth.c.en + ' is your biggest category this month, at ' + pctOf(topMonth.amt, monthTotal) + ' of your spending.');
  if (prevAvg > 0) sentences.push(ar ? (avgDiff <= 0 ? 'معدل صرفك اليومي أقل بنسبة ' : 'معدل صرفك اليومي أعلى بنسبة ') + Math.abs(Math.round(avgDiff)) + '% من الشهر الماضي.' : 'You’re spending ' + Math.abs(Math.round(avgDiff)) + '% ' + (avgDiff <= 0 ? 'less' : 'more') + ' per day than last month.');
  if (income > 0) sentences.push(ar ? 'صرفت حتى الآن ' + pctOf(monthTotal, income) + ' من دخلك الشهري (' + money(income) + ').' : 'So far you’ve spent ' + pctOf(monthTotal, income) + ' of your monthly income (' + money(income) + ').');

  return { weeks, line, area, lastP, fullWeeks, months, maxM, highTx, prevAvg, avgDiff, top5, maxC, sentences };
}
