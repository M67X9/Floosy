import { supabase, supabaseConfigured } from './supabase';
import type { CatId } from './i18n';
import type { Tx } from './types';

// Rows in the "Expenses" table: amount_kwd, expense_date, expense_time, category, description, image.
type Row = { id: string; amount_kwd: number | string; expense_date: string; expense_time: string; category: CatId; description: string | null; image: string | null };

const fromRow = (r: Row): Tx => ({
  id: r.id, amount: Number(r.amount_kwd), date: r.expense_date, time: r.expense_time, cat: r.category,
  en: r.description ?? '', ar: r.description ?? '', image: r.image ?? null
});

const TABLE = 'Expenses';
const BUCKET = 'Invoices';
const PAGE = 1000;

export async function fetchExpenses(): Promise<Tx[]> {
  if (!supabaseConfigured) throw new Error('Supabase is not configured');
  const out: Tx[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(TABLE).select('*').order('expense_date', { ascending: false }).order('expense_time', { ascending: false }).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data as Row[]).map(fromRow));
    if (data.length < PAGE) return out;
  }
}

// The time column defaults to the current Kuwait time on insert. `image` is a path returned by uploadInvoice.
export async function insertExpense(x: { amount: number; date: string; cat: CatId; description: string; image?: string | null }): Promise<Tx> {
  const { data, error } = await supabase.from(TABLE).insert({ amount_kwd: x.amount, expense_date: x.date, category: x.cat, description: x.description || null, image: x.image ?? null }).select().single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function updateExpense(id: string, patch: { amount?: number; date?: string; cat?: CatId; description?: string; image?: string | null }): Promise<Tx> {
  const body: Record<string, unknown> = {};
  if (patch.amount !== undefined) body.amount_kwd = patch.amount;
  if (patch.date !== undefined) body.expense_date = patch.date;
  if (patch.cat !== undefined) body.category = patch.cat;
  if (patch.description !== undefined) body.description = patch.description || null;
  if (patch.image !== undefined) body.image = patch.image;
  const { data, error } = await supabase.from(TABLE).update(body).eq('id', id).select().single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

export async function deleteAllExpenses() {
  const { error } = await supabase.from(TABLE).delete().not('id', 'is', null);
  if (error) throw error;
}

/* ---------- invoice photos (Supabase Storage bucket "Invoices") ---------- */
// Photos are never deleted from the bucket: replacing or removing an invoice only changes the `image` column,
// so Expenses_History can still point at the earlier photo.

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };

export type PickedImage = { uri: string; mimeType?: string | null };

// Uploads a picked photo and returns its path in the bucket (store that in `image`).
export async function uploadInvoice(img: PickedImage): Promise<string> {
  const res = await fetch(img.uri);
  const body = await res.arrayBuffer();
  const type = img.mimeType && EXT[img.mimeType] ? img.mimeType : 'image/jpeg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${EXT[type]}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: type });
  if (error) throw error;
  return path;
}

// The bucket is private, so photos are shown through short-lived signed links.
const TTL = 3600;
const urlCache = new Map<string, { url: string; expires: number }>();

export async function invoiceUrl(path: string): Promise<string> {
  const hit = urlCache.get(path);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, TTL);
  if (error) throw error;
  urlCache.set(path, { url: data.signedUrl, expires: Date.now() + (TTL - 300) * 1000 });
  return data.signedUrl;
}
