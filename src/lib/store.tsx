import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import { todayISO } from './dates';
import { deleteAllExpenses, deleteExpense, fetchExpenses, insertExpense, updateExpense } from './expenses';
import { T, type CatId, type Lang, type Strings } from './i18n';
import { supabase } from './supabase';
import { dark as darkTheme, light as lightTheme, type Theme } from './theme';
import type { Profile, Tx } from './types';

// Language and appearance belong to the device. Everything else belongs to the signed-in user: it is cached
// per user id on the device, and the name, income and budget are also saved in the user's Supabase account
// (user_metadata.floosy) so they follow the user to another device.
const PREFS_KEY = 'floosy.prefs.v1';
const LEGACY_KEY = 'floosy.state.v1'; // before accounts existed: one blob for everything
const userKey = (id: string) => `floosy.user.v1.${id}`;

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

type UserData = Pick<Persisted, 'profile' | 'txs' | 'budget' | 'catBudgets'>;
const freshUser = (): UserData => ({ profile: null, txs: [], budget: 750, catBudgets: DEFAULT_CAT_BUDGETS });
type Meta = { profile?: Profile | null; budget?: number };

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
  const { user, ready: authReady } = useAuth();
  const userId = user?.id ?? null;
  const [s, setS] = useState<Persisted>(initial);
  const [prefsReady, setPrefsReady] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [today, setToday] = useState(todayISO);
  const sRef = useRef(s);
  sRef.current = s;
  const metaRef = useRef<Meta | undefined>(undefined);
  metaRef.current = (user?.user_metadata as { floosy?: Meta } | undefined)?.floosy;

  // Device preferences, once.
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then(async (raw) => {
        const saved = raw ? (JSON.parse(raw) as Partial<Persisted>) : JSON.parse((await AsyncStorage.getItem(LEGACY_KEY)) ?? '{}') as Partial<Persisted>;
        setS((cur) => ({ ...cur, lang: saved.lang ?? cur.lang, dark: saved.dark ?? cur.dark }));
      })
      .catch(() => {})
      .finally(() => setPrefsReady(true));
  }, []);

  // Load the signed-in user's cached data (and forget the previous user's).
  useEffect(() => {
    if (!authReady) return;
    setS((c) => ({ ...c, ...freshUser() }));
    if (!userId) { setLoadedFor(null); return; }
    let cancelled = false;
    setLoadedFor(null);
    (async () => {
      let saved: Partial<UserData> = {};
      try {
        const raw = await AsyncStorage.getItem(userKey(userId));
        if (raw) saved = JSON.parse(raw);
        else {
          // First sign-in on a device that used Floosy before accounts: keep its name, income and budget (not the old expense cache).
          const old = await AsyncStorage.getItem(LEGACY_KEY);
          if (old) {
            const o = JSON.parse(old) as Partial<Persisted>;
            saved = { profile: o.profile, budget: o.budget, catBudgets: o.catBudgets };
            await AsyncStorage.removeItem(LEGACY_KEY);
          }
        }
      } catch { /* start fresh */ }
      if (cancelled) return;
      const meta = metaRef.current;
      const profile = meta?.profile ?? saved.profile ?? null;
      const budget = meta?.budget ?? saved.budget ?? 750;
      setS((c) => ({ ...c, profile, budget, catBudgets: saved.catBudgets ?? DEFAULT_CAT_BUDGETS, txs: (saved.txs ?? []).filter((x) => typeof x.id === 'string') }));
      setLoadedFor(userId);
      // Details that only exist on this device are copied to the account.
      if (!meta && profile) supabase.auth.updateUser({ data: { floosy: { profile, budget } } }).catch(() => {});
    })();
    return () => { cancelled = true; };
  }, [authReady, userId]);

  const ready = prefsReady && authReady && (userId ? loadedFor === userId : true);

  // Pull the latest expenses from Supabase once the user's data is ready.
  useEffect(() => {
    if (!ready || !userId) return;
    let cancelled = false;
    fetchExpenses().then((txs) => { if (!cancelled) setS((c) => ({ ...c, txs })); }).catch((e) => console.warn('Could not load expenses', e));
    return () => { cancelled = true; };
  }, [ready, userId]);

  useEffect(() => {
    if (!prefsReady) return;
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ lang: s.lang, dark: s.dark })).catch(() => {});
  }, [s.lang, s.dark, prefsReady]);

  useEffect(() => {
    if (!userId || loadedFor !== userId) return;
    AsyncStorage.setItem(userKey(userId), JSON.stringify({ profile: s.profile, txs: s.txs, budget: s.budget, catBudgets: s.catBudgets })).catch(() => {});
  }, [s.profile, s.txs, s.budget, s.catBudgets, userId, loadedFor]);

  // Roll the "today" date over at midnight (Kuwait time).
  useEffect(() => {
    const id = setInterval(() => setToday(todayISO()), 30000);
    return () => clearInterval(id);
  }, []);

  const setLang = useCallback((lang: Lang) => setS((c) => ({ ...c, lang })), []);
  const setDark = useCallback((dark: boolean) => setS((c) => ({ ...c, dark })), []);
  const syncMeta = useCallback((meta: Meta | null) => {
    supabase.auth.updateUser({ data: { floosy: meta } }).catch((e) => console.warn('Could not save to the account', e));
  }, []);
  const saveProfile = useCallback((profile: Profile) => {
    setS((c) => ({ ...c, profile }));
    syncMeta({ profile, budget: sRef.current.budget });
  }, [syncMeta]);
  const setBudget = useCallback((budget: number) => {
    setS((c) => ({ ...c, budget }));
    syncMeta({ profile: sRef.current.profile, budget });
  }, [syncMeta]);

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
      setS((c) => ({ ...c, ...freshUser() }));
      syncMeta(null);
      return true;
    } catch (e) { console.warn('Could not reset', e); return false; }
  }, [syncMeta]);

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
