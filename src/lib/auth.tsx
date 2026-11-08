import type { User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase, supabaseConfigured } from './supabase';

// What the sign-in and sign-up screens need to know about a failed attempt.
export type AuthError = 'invalid' | 'exists' | 'unconfirmed' | 'weak' | 'email' | 'rate' | 'network' | 'other';
export type AuthResult = { ok: true; needsConfirm: boolean } | { ok: false; error: AuthError };

type Ctx = {
  ready: boolean; user: User | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, profile: { name: string; income: number }) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

function errorOf(e: { code?: string; name?: string; status?: number }): AuthError {
  switch (e.code) {
    case 'invalid_credentials': return 'invalid';
    case 'email_not_confirmed': return 'unconfirmed';
    case 'user_already_exists': case 'email_exists': return 'exists';
    case 'weak_password': return 'weak';
    case 'email_address_invalid': case 'validation_failed': return 'email';
    case 'over_request_rate_limit': case 'over_email_send_rate_limit': return 'rate';
  }
  if (e.name === 'AuthRetryableFetchError' || e.status === 0) return 'network';
  return 'other';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null)).catch(() => {}).finally(() => setReady(true));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  // On a phone the token must only refresh while the app is in front.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') supabase.auth.startAutoRefresh(); else supabase.auth.stopAutoRefresh(); });
    return () => sub.remove();
  }, []);

  const signIn = useCallback<Ctx['signIn']>(async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { ok: false, error: errorOf(error) } : { ok: true, needsConfirm: false };
    } catch { return { ok: false, error: 'network' }; }
  }, []);

  // With "Confirm email" on (the Supabase default) there is no session until the link in the email is opened.
  const signUp = useCallback<Ctx['signUp']>(async (email, password, profile) => {
    try {
      const emailRedirectTo = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo, data: { display_name: profile.name, floosy: { profile, budget: 750 } } } });
      if (error) return { ok: false, error: errorOf(error) };
      // For an email that is already registered Supabase answers with a user that has no identities.
      if (data.user && data.user.identities?.length === 0) return { ok: false, error: 'exists' };
      return { ok: true, needsConfirm: !data.session };
    } catch { return { ok: false, error: 'network' }; }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    // signOut can fail offline; make sure this device forgets the session anyway.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    setUser(null);
  }, []);

  const value = useMemo<Ctx>(() => ({ ready, user, signIn, signUp, signOut }), [ready, user, signIn, signUp, signOut]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
