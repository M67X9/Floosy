import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { todayISO } from './dates';
import { deleteAllExpenses, deleteExpense, fetchExpenses, insertExpense, updateExpense } from './expenses';
import { T, type CatId, type Lang, type Strings } from './i18n';
import { dark as darkTheme, light as lightTheme, type Theme } from './theme';
import type { Profile, Tx } from './types';

const KEY = 'floosy.state.v1';

// Expenses live in Supabase; `txs` here is a local cache so the app opens with data before the network answers.
type Persisted = {
  lang: Lang; dark: boolean; profile: Profile | null; txs: Tx[];
  budget: number; catBudgets: Partial<Record<CatId, number>>;
};

const DEFAULT_CAT_BUDGETS: Persisted['catBudgets'] = { food: 200, shop: 120, loan: 125, bills: 60, health: 50, fuel: 40, trans: 40, ent: 40, other: 40, subs: 15 };

function initial(): Persisted {
  const deviceAr = getLocales()[0]?.languageCode === 'ar';
  return { lang: deviceAr ? 'ar' : 'en', dark: false, profile: null, txs: [], budget: 750, catBudgets: DEFAULT_CAT_BUDGETS };
}

type Patch = { amount?: number; date?: string; cat?: CatId; description?: string; image?: string | null };

type Ctx = Persisted & {
  ready: boolean; today: string; t: Strings; theme: Theme; rtl: boolean;
  setLang: (l: Lang) => void; setDark: (d: boolean) => void;
  saveProfile: (p: Profile) => void;
  // Each returns whether it succeeded (false = the database could not be reached).
  addTx: (x: { amount: number; date: string; cat: CatId; description: string; image?: string | null }) => Promise<Tx | null>;
  updateTx: (id: string, patch: Patch) => Promise<boolean>;
  deleteTx: (id: string) => Promise<boolean>;
  setBudget: (n: number) => void;
  resetAll: () => Promise<boolean>;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Persisted>(initial);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(todayISO);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Persisted>;
        // Older builds cached expenses with numeric ids; drop those, the database is the source of truth.
        setS((cur) => ({ ...cur, ...saved, txs: (saved.txs ?? []).filter((x) => typeof x.id === 'string') }));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Pull the latest expenses from Supabase once the app is ready.
  useEffect(() => {
    if (!ready) return;
    fetchExpenses().then((txs) => setS((c) => ({ ...c, txs }))).catch((e) => console.warn('Could not load expenses', e));
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
  }, [s, ready]);

  // Roll the "today" date over at midnight (Kuwait time).
  useEffect(() => {
    const id = setInterval(() => setToday(todayISO()), 30000);
    return () => clearInterval(id);
  }, []);

  const setLang = useCallback((lang: Lang) => setS((c) => ({ ...c, lang })), []);
  const setDark = useCallback((dark: boolean) => setS((c) => ({ ...c, dark })), []);
  const saveProfile = useCallback((profile: Profile) => setS((c) => ({ ...c, profile })), []);
  const setBudget = useCallback((budget: number) => setS((c) => ({ ...c, budget })), []);

  const addTx = useCallback(async (x: Parameters<Ctx['addTx']>[0]) => {
    try {
      const tx = await insertExpense(x);
      setS((c) => ({ ...c, txs: c.txs.concat([tx]) }));
      return tx;
    } catch (e) { console.warn('Could not add expense', e); return null; }
  }, []);

  const updateTx = useCallback(async (id: string, patch: Patch) => {
    try {
      const tx = await updateExpense(id, patch);
      setS((c) => ({ ...c, txs: c.txs.map((x) => (x.id === id ? tx : x)) }));
      return true;
    } catch (e) { console.warn('Could not update expense', e); return false; }
  }, []);

  const deleteTx = useCallback(async (id: string) => {
    try {
      await deleteExpense(id);
      setS((c) => ({ ...c, txs: c.txs.filter((x) => x.id !== id) }));
      return true;
    } catch (e) { console.warn('Could not delete expense', e); return false; }
  }, []);

  // Back to a brand-new install, including the expenses in Supabase; language and appearance are kept.
  const resetAll = useCallback(async () => {
    try {
      await deleteAllExpenses();
      setS((c) => ({ ...initial(), lang: c.lang, dark: c.dark }));
      return true;
    } catch (e) { console.warn('Could not reset', e); return false; }
  }, []);

  const value = useMemo<Ctx>(() => ({
    ...s, ready, today, t: T[s.lang], theme: s.dark ? darkTheme : lightTheme, rtl: s.lang === 'ar',
    setLang, setDark, saveProfile, addTx, updateTx, deleteTx, setBudget, resetAll
  }), [s, ready, today, setLang, setDark, saveProfile, addTx, updateTx, deleteTx, setBudget, resetAll]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
