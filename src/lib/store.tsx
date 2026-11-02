import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SEED_DEMO_DATA } from './config';
import { todayISO } from './dates';
import { T, type CatId, type Lang, type Strings } from './i18n';
import { seedTxs } from './seed';
import { dark as darkTheme, light as lightTheme, type Theme } from './theme';
import type { Profile, Tx } from './types';

const KEY = 'floosy.state.v1';

type Persisted = {
  lang: Lang; dark: boolean; profile: Profile | null; txs: Tx[]; nextId: number;
  budget: number; catBudgets: Partial<Record<CatId, number>>;
};

const DEFAULT_CAT_BUDGETS: Persisted['catBudgets'] = { food: 200, shop: 120, loan: 125, bills: 60, health: 50, fuel: 40, trans: 40, ent: 40, other: 40, subs: 15 };

function initial(): Persisted {
  const deviceAr = getLocales()[0]?.languageCode === 'ar';
  return {
    lang: deviceAr ? 'ar' : 'en', dark: false, profile: null,
    txs: SEED_DEMO_DATA ? seedTxs(todayISO()) : [], nextId: 100000,
    budget: 750, catBudgets: DEFAULT_CAT_BUDGETS
  };
}

type Ctx = Persisted & {
  ready: boolean; today: string; t: Strings; theme: Theme; rtl: boolean;
  setLang: (l: Lang) => void; setDark: (d: boolean) => void;
  saveProfile: (p: Profile) => void;
  addTx: (x: Omit<Tx, 'id'>) => number;
  updateTx: (id: number, patch: Partial<Omit<Tx, 'id'>>) => void;
  deleteTx: (id: number) => void;
  setBudget: (n: number) => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Persisted>(initial);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(todayISO);
  const nextId = useRef(s.nextId);
  nextId.current = s.nextId;

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => { if (raw) setS((cur) => ({ ...cur, ...JSON.parse(raw) })); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

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
  const addTx = useCallback((x: Omit<Tx, 'id'>) => {
    const id = nextId.current;
    setS((c) => ({ ...c, txs: c.txs.concat([{ ...x, id }]), nextId: c.nextId + 1 }));
    return id;
  }, []);
  const updateTx = useCallback((id: number, patch: Partial<Omit<Tx, 'id'>>) => setS((c) => ({ ...c, txs: c.txs.map((x) => (x.id === id ? { ...x, ...patch } : x)) })), []);
  const deleteTx = useCallback((id: number) => setS((c) => ({ ...c, txs: c.txs.filter((x) => x.id !== id) })), []);
  const setBudget = useCallback((budget: number) => setS((c) => ({ ...c, budget })), []);

  const value = useMemo<Ctx>(() => ({
    ...s, ready, today, t: T[s.lang], theme: s.dark ? darkTheme : lightTheme, rtl: s.lang === 'ar',
    setLang, setDark, saveProfile, addTx, updateTx, deleteTx, setBudget
  }), [s, ready, today, setLang, setDark, saveProfile, addTx, updateTx, deleteTx, setBudget]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const v = useContext(StoreCtx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}
