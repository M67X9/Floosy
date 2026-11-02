import type { Lang } from './i18n';

// Kuwaiti dinar is shown with 3 decimals.
export const f3 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
export const curOf = (lang: Lang) => (lang === 'ar' ? 'د.ك' : 'KD');
export const moneyOf = (lang: Lang) => (n: number) => f3(n) + ' ' + curOf(lang);
