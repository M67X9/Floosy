import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Tx } from '../lib/types';

export type Sheet = { kind: 'add'; editing: Tx | null } | { kind: 'detail'; id: string } | null;

type UI = {
  sheet: Sheet; flashId: string | null; toast: { id: number; msg: string } | null; editingProfile: boolean;
  openAdd: () => void; openEdit: (x: Tx) => void; openDetail: (id: string) => void; closeSheet: () => void;
  showToast: (msg: string) => void; flash: (id: string) => void;
  editProfile: () => void; closeProfile: () => void;
};

const Ctx = createContext<UI | null>(null);

// Transient UI state: bottom sheets, toast, row highlight, and the "edit name & income" screen.
export function UIProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [toast, setToast] = useState<UI['toast']>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const timers = useRef<{ t?: ReturnType<typeof setTimeout>; f?: ReturnType<typeof setTimeout> }>({});
  const n = useRef(0);

  useEffect(() => () => { clearTimeout(timers.current.t); clearTimeout(timers.current.f); }, []);

  const showToast = useCallback((msg: string) => {
    clearTimeout(timers.current.t);
    setToast({ id: ++n.current, msg });
    timers.current.t = setTimeout(() => setToast(null), 2000);
  }, []);
  const flash = useCallback((id: string) => {
    clearTimeout(timers.current.f);
    setFlashId(id);
    timers.current.f = setTimeout(() => setFlashId(null), 1900);
  }, []);

  const value = useMemo<UI>(() => ({
    sheet, flashId, toast, editingProfile,
    openAdd: () => setSheet({ kind: 'add', editing: null }),
    openEdit: (x) => setSheet({ kind: 'add', editing: x }),
    openDetail: (id) => setSheet({ kind: 'detail', id }),
    closeSheet: () => setSheet(null),
    showToast, flash,
    editProfile: () => setEditingProfile(true), closeProfile: () => setEditingProfile(false)
  }), [sheet, flashId, toast, editingProfile, showToast, flash]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUI() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useUI must be used inside UIProvider');
  return v;
}
