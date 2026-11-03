import type { CatId } from './i18n';

// `id` is the row's uuid in the Supabase "Expenses" table; `time` is Kuwait local "HH:MM:SS".
// `image` is the path of the invoice photo inside the "Invoices" storage bucket, or null.
export type Tx = { id: string; date: string; time: string; cat: CatId; en: string; ar: string; amount: number; image: string | null };
export type Profile = { name: string; income: number };
