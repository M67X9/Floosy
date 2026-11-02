import { addDays } from './dates';
import type { Tx } from './types';
import type { CatId } from './i18n';

// Demo data from the prototype: a deterministic ~11 months of Kuwait-style spending.
export function seedTxs(today: string): Tx[] {
  let s = 20261102;
  const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const amt = (a: number, b: number) => Math.round((a + r() * (b - a)) * 20) / 20;
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const P: Record<string, [string, string, number, number][]> = {
    food: [['Talabat order', 'طلب من طلبات', 3.5, 9], ['Tim Hortons', 'تيم هورتنز', 1.25, 3], ['Lunch', 'غداء', 2.5, 6], ['The Sultan Center', 'مركز سلطان', 8, 28], ['Shawarma', 'شاورما', 0.75, 2], ['Coffee', 'قهوة', 1, 2.5], ['Co-op groceries', 'مقاضي الجمعية', 6, 22]],
    ent: [['Cinescape tickets', 'تذاكر سينسكيب', 3.5, 7], ['Bowling night', 'سهرة بولينغ', 4, 8], ['PlayStation Store', 'متجر بلايستيشن', 5, 15]],
    fuel: [['Oula fuel', 'بنزين أولى', 5, 8], ['Alfa fuel', 'بنزين ألفا', 4.5, 7.5]],
    shop: [['Zara — The Avenues', 'زارا — الأفنيوز', 15, 45], ['Amazon order', 'طلب أمازون', 6, 25], ['IKEA', 'ايكيا', 10, 60], ['Noon order', 'طلب نون', 5, 20]],
    trans: [['Careem ride', 'مشوار كريم', 1.5, 4], ['Car wash', 'غسيل السيارة', 2, 3], ['Parking', 'مواقف', 0.5, 1]],
    health: [['Pharmacy', 'صيدلية', 2, 9]],
    other: [['Gift', 'هدية', 5, 25], ['Barber', 'حلاق', 3, 5], ['Laundry', 'مصبغة', 2, 4]]
  };
  const out: Tx[] = []; let id = 1;
  const push = (date: string, cat: CatId, en: string, ar: string, amount: number) => out.push({ id: id++, date, cat, en, ar, amount });
  const rand = (date: string, cat: CatId) => { const p = pick(P[cat]); push(date, cat, p[0], p[1], amt(p[2], p[3])); };
  for (let i = 330; i >= 0; i--) {
    const date = addDays(today, -i); const dom = +date.slice(8, 10);
    if (dom === 1) push(date, 'loan', 'Car loan installment', 'قسط قرض السيارة', 125);
    if (dom === 3) push(date, 'subs', 'Netflix', 'نتفليكس', 3);
    if (dom === 4) push(date, 'health', 'Gym membership', 'اشتراك النادي الرياضي', 28);
    if (dom === 5) push(date, 'bills', 'Zain postpaid', 'فاتورة زين', 12);
    if (dom === 8) push(date, 'subs', 'Spotify Premium', 'سبوتيفاي بريميوم', 1.5);
    if (dom === 10) push(date, 'bills', 'Home internet', 'الإنترنت المنزلي', 15);
    if (dom === 12) push(date, 'subs', 'iCloud+', 'آي كلاود+', 0.99);
    if (dom === 14) push(date, 'bills', 'Electricity & water', 'الكهرباء والماء', amt(9, 18));
    if (dom === 20) push(date, 'subs', 'Shahid VIP', 'شاهد VIP', 2.5);
    if (i === 0) {
      push(date, 'food', 'Tim Hortons', 'تيم هورتنز', 1.85);
      push(date, 'trans', 'Car wash', 'غسيل السيارة', 2.5);
      continue;
    }
    const nf = r() < 0.85 ? (r() < 0.4 ? 2 : 1) : 0;
    for (let k = 0; k < nf; k++) rand(date, 'food');
    if (r() < 0.17) rand(date, 'fuel');
    if (r() < 0.16) rand(date, 'shop');
    if (r() < 0.33) rand(date, 'trans');
    if (r() < 0.1) rand(date, 'ent');
    if (r() < 0.07) rand(date, 'health');
    if (r() < 0.1) rand(date, 'other');
  }
  return out;
}
