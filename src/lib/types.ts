import type { CatId } from './i18n';

// `id` is the row's uuid in the Supabase "Expenses" table; `time` is Kuwait local "HH:MM:SS".
export type Tx = { id: string; date: string; time: string; cat: CatId; en: string; ar: string; amount: number };
export type Profile = { name: string; income: number };
