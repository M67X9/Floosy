import { supabase, supabaseConfigured } from './supabase';
import type { CatId } from './i18n';
import type { Tx } from './types';

// Rows in the "Expenses" table: amount_kwd, expense_date, expense_time, category, description.
type Row = { id: string; amount_kwd: number | string; expense_date: string; expense_time: string; category: CatId; description: string | null };

const fromRow = (r: Row): Tx => ({
  id: r.id, amount: Number(r.amount_kwd), date: r.expense_date, time: r.expense_time, cat: r.category,
  en: r.description ?? '', ar: r.description ?? ''
});

const TABLE = 'Expenses';
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

// The time column defaults to the current Kuwait time on insert.
export async function insertExpense(x: { amount: number; date: string; cat: CatId; description: string }): Promise<Tx> {
  const { data, error } = await supabase.from(TABLE).insert({ amount_kwd: x.amount, expense_date: x.date, category: x.cat, description: x.description || null }).select().single();
  if (error) throw error;
  return fromRow(data as Row);
}

export async function updateExpense(id: string, patch: { amount?: number; date?: string; cat?: CatId; description?: string }): Promise<Tx> {
  const body: Record<string, unknown> = {};
  if (patch.amount !== undefined) body.amount_kwd = patch.amount;
  if (patch.date !== undefined) body.expense_date = patch.date;
  if (patch.cat !== undefined) body.category = patch.cat;
  if (patch.description !== undefined) body.description = patch.description || null;
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
