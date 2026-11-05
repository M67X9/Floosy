import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, type AuthError } from '../lib/auth';
import { normalizeNumber } from '../lib/num';
import { curOf } from '../lib/money';
import { useStore } from '../lib/store';
import { Chev, Press, Seg, Txt } from './ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

// Sign in / create account. Shown instead of the app whenever nobody is signed in.
export function AuthScreen() {
  const { lang, t, theme, setLang, rtl } = useStore();
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const messages: Record<AuthError, string> = {
    invalid: t.authInvalid, exists: t.authExists, unconfirmed: t.authUnconfirmed, weak: t.authPassErr,
    email: t.authEmailErr, rate: t.authRate, network: t.authNetwork, other: t.authOther
  };

  const switchMode = (m: 'in' | 'up') => { setMode(m); setErr(null); setPassword(''); setConfirm(''); };

  const submit = async () => {
    if (busy) return;
    const em = email.trim();
    if (!EMAIL.test(em)) { setErr(t.authEmailErr); return; }
    if (mode === 'up') {
      if (!name.trim()) { setErr(t.obNameErr); return; }
      if (!(parseFloat(income) > 0)) { setErr(t.obIncomeErr); return; }
      if (password.length < MIN_PASSWORD) { setErr(t.authPassErr); return; }
      if (password !== confirm) { setErr(t.authMatchErr); return; }
    } else if (!password) { setErr(t.authPassEmpty); return; }
    setErr(null); setBusy(true);
    const r = mode === 'up' ? await signUp(em, password, { name: name.trim(), income: Math.round(parseFloat(income) * 1000) / 1000 }) : await signIn(em, password);
    setBusy(false);
    if (!r.ok) { setErr(messages[r.error]); return; }
    // Signed in: the app takes over. Signed up but unconfirmed: ask them to open the email.
    if (r.needsConfirm) setSentTo(em);
  };

  const field = { height: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, paddingHorizontal: 14, color: theme.ink, fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 16, textAlign: 'left' } as const;
  const up = mode === 'up';

  return (
    <View style={{ flex: 1, backgroundColor: theme.hero, direction: rtl ? 'rtl' : 'ltr' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -60, end: -90, width: 320, height: 320, opacity: 0.18 }}>
        {[30, 48, 66, 84, 99].map((r) => <View key={r} style={{ position: 'absolute', width: r * 3.2, height: r * 3.2, borderRadius: r * 1.6, borderWidth: 1, borderColor: theme.lime, top: 160 - r * 1.6, start: 160 - r * 1.6 }} />)}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingTop: insets.top + 18, paddingHorizontal: 20, alignItems: 'flex-end' }}>
            <Seg onHero style={{ width: 170 }} label={t.language} value={lang} onChange={setLang} options={[['en', 'English'], ['ar', 'العربية']]} />
          </View>
          <View style={{ gap: 14, paddingTop: 36, paddingHorizontal: 28, paddingBottom: 32 }}>
            <View style={{ width: 60, height: 60, borderRadius: 19, backgroundColor: theme.lime, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={38} w={800} display color="#0C3B31" style={{ marginTop: -5 }}>f</Txt>
            </View>
            <Txt size={36} w={800} display ls={-1.2} lh={40} style={{ marginTop: 8 }} color={theme.heroInk}>{sentTo ? t.authCheckTitle : up ? t.authUpTitle : t.authInTitle}</Txt>
            <Txt size={16} color={theme.heroMuted} lh={24} style={{ maxWidth: 320 }}>{sentTo ? t.authCheckBody : up ? t.authUpBody : t.authInBody}</Txt>
          </View>

          <View style={{ marginTop: 'auto', backgroundColor: theme.surface, borderTopStartRadius: 30, borderTopEndRadius: 30, paddingTop: 26, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 16, gap: 16 }}>
            {sentTo ? (
              <>
                <View style={{ borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, padding: 14 }}>
                  <Txt size={16} w={600} ltr>{sentTo}</Txt>
                </View>
                <Press onPress={() => { setSentTo(null); switchMode('in'); }} style={{ height: 56, borderRadius: 18, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={16} w={700} color={theme.brandInk}>{t.authBackToSignIn}</Txt>
                </Press>
              </>
            ) : (
              <>
                {up ? (
                  <>
                    <View style={{ gap: 8 }}>
                      <Txt size={13} w={600} color={theme.muted}>{t.obName}</Txt>
                      <TextInput value={name} onChangeText={(v) => { setName(v); setErr(null); }} placeholder={t.obNamePh} placeholderTextColor={theme.muted} autoComplete="given-name" textContentType="givenName" returnKeyType="next"
                        style={[field, { textAlign: rtl ? 'right' : 'left' }]} />
                    </View>
                    <View style={{ gap: 8 }}>
                      <Txt size={13} w={600} color={theme.muted}>{t.obIncome}</Txt>
                      <View style={{ direction: 'ltr', justifyContent: 'center' }}>
                        <TextInput value={income} onChangeText={(raw) => { const v = normalizeNumber(raw); if (/^\d{0,7}(\.\d{0,3})?$/.test(v)) { setIncome(v); setErr(null); } }} placeholder="0.000" placeholderTextColor={theme.muted} keyboardType="decimal-pad" inputMode="decimal"
                          style={[field, { paddingEnd: 60 }]} />
                        <View pointerEvents="none" style={{ position: 'absolute', right: 16 }}><Txt size={15} w={700} color={theme.muted}>{curOf(lang)}</Txt></View>
                      </View>
                    </View>
                  </>
                ) : null}
                <View style={{ gap: 8 }}>
                  <Txt size={13} w={600} color={theme.muted}>{t.authEmail}</Txt>
                  <TextInput value={email} onChangeText={(v) => { setEmail(v); setErr(null); }} placeholder="name@example.com" placeholderTextColor={theme.muted}
                    keyboardType="email-address" inputMode="email" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" style={field} />
                </View>
                <View style={{ gap: 8 }}>
                  <Txt size={13} w={600} color={theme.muted}>{t.authPassword}</Txt>
                  <TextInput value={password} onChangeText={(v) => { setPassword(v); setErr(null); }} placeholder={up ? t.authPassHint : '••••••••'} placeholderTextColor={theme.muted}
                    secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={up ? 'new-password' : 'current-password'} textContentType={up ? 'newPassword' : 'password'}
                    returnKeyType={up ? 'next' : 'go'} onSubmitEditing={up ? undefined : submit} style={field} />
                </View>
                {up ? (
                  <View style={{ gap: 8 }}>
                    <Txt size={13} w={600} color={theme.muted}>{t.authConfirm}</Txt>
                    <TextInput value={confirm} onChangeText={(v) => { setConfirm(v); setErr(null); }} placeholder="••••••••" placeholderTextColor={theme.muted}
                      secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={submit} style={field} />
                  </View>
                ) : null}
                {err ? <Txt size={13} w={600} color={theme.up}>{err}</Txt> : null}
                <Press onPress={submit} disabled={busy} style={{ height: 56, borderRadius: 18, backgroundColor: theme.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy ? 0.7 : 1 }}>
                  {busy ? <ActivityIndicator color={theme.brandInk} /> : (
                    <>
                      <Txt size={16} w={700} color={theme.brandInk}>{up ? t.authSignUp : t.authSignIn}</Txt>
                      <Chev dir="R" size={20} color={theme.brandInk} />
                    </>
                  )}
                </Press>
                <Press onPress={() => switchMode(up ? 'in' : 'up')} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt size={15} w={600} color={theme.brandText}>{up ? t.authToSignIn : t.authToSignUp}</Txt>
                </Press>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
