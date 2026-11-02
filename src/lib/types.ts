import type { CatId } from './i18n';

export type Tx = { id: number; date: string; cat: CatId; en: string; ar: string; amount: number };
export type Profile = { name: string; income: number };
