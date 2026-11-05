import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card, Chev, Icon, Press, Seg, Txt } from '../../components/ui';
import { useUI } from '../../components/ui-state';
import type { IconName } from '../../lib/icons';
import { useAuth } from '../../lib/auth';
import { moneyOf } from '../../lib/money';
import { useStore } from '../../lib/store';

export default function Settings() {
  const { lang, t, theme, profile, budget, setLang, dark, setDark, resetAll, rtl } = useStore();
  const { user, signOut } = useAuth();
  const { editProfile, closeSheet, closeProfile, showToast } = useUI();
  const [confirming, setConfirming] = useState(false);
  const [resetFailed, setResetFailed] = useState(false);
  const money = moneyOf(lang);
  const name = profile?.name || t.friend;

  const row = (icon: IconName, label: string, right: ReactNode, opts?: { last?: boolean; onPress?: () => void; pad?: number }) => {
    const style = { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: opts?.pad ?? 14, minHeight: 52, borderBottomWidth: opts?.last ? 0 : 1, borderBottomColor: theme.line } as const;
    const body = (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Icon name={icon} size={18} /><Txt size={15} w={600}>{label}</Txt></View>
        {right}
      </>
    );
    return opts?.onPress ? <Press onPress={opts.onPress} style={style}>{body}</Press> : <View style={style}>{body}</View>;
  };

  const doReset = async () => {
    setResetFailed(false);
    const ok = await resetAll();
    if (!ok) { setResetFailed(true); return; }
    setConfirming(false);
    closeSheet(); closeProfile();
    router.navigate('/');
    showToast(t.toastReset);
  };

  return (
    <Screen>
      <Txt size={30} w={700} display ls={-0.75} lh={34}>{t.setTitle}</Txt>

      <Card flat style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.hero, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={22} w={700} display color={theme.lime}>{name.trim().charAt(0).toUpperCase()}</Txt>
        </View>
        <View style={{ gap: 2 }}>
          <Txt size={17} w={700}>{name}</Txt>
          <Txt size={13} color={theme.muted} ltr lines={1}>{user?.email ?? t.profileSub}</Txt>
        </View>
      </Card>

      <Card flat style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
        {row('lang', t.language, <Seg label={t.language} style={{ width: 170 }} value={lang} onChange={setLang} options={[['en', 'English'], ['ar', 'العربية']]} />, { pad: 12 })}
        {row('moon', t.appearance, <Seg label={t.appearance} style={{ width: 170 }} value={dark} onChange={setDark} options={[[false, t.light], [true, t.dark]]} />, { pad: 12 })}
        {row('target', t.budget, <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Txt size={14} color={theme.muted} ltr>{money(budget)}</Txt><Chev dir="R" size={18} color={theme.muted} /></View>, { onPress: () => router.navigate('/budget') })}
        {row('up', t.income, <Txt size={14} color={theme.muted} ltr>{profile && profile.income > 0 ? money(profile.income) : '—'}</Txt>)}
        {row('wallet', t.currency, <Txt size={14} color={theme.muted}>{t.kwd}</Txt>, { last: true })}
      </Card>

      <Card flat style={{ paddingHorizontal: 16 }}>
        <Press onPress={signOut} label={t.signOut} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.line }}>
          <Icon name="chevL" size={18} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={15} w={600}>{t.signOut}</Txt>
            <Txt size={12.5} color={theme.muted}>{t.signOutSub}</Txt>
          </View>
        </Press>
        <Press onPress={() => setConfirming(true)} label={t.resetRow} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingVertical: 12 }}>
          <Icon name="trash" size={18} color={theme.up} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={15} w={600} color={theme.up}>{t.resetRow}</Txt>
            <Txt size={12.5} color={theme.muted}>{t.resetSub}</Txt>
          </View>
        </Press>
      </Card>

      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)} statusBarTranslucent>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, direction: rtl ? 'rtl' : 'ltr' }}>
          <Pressable accessibilityLabel={t.cancel} onPress={() => setConfirming(false)} style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: theme.overlay }} />
          <View accessibilityViewIsModal accessibilityRole="alert" style={{ width: '100%', maxWidth: 340, borderRadius: 24, backgroundColor: theme.surface, padding: 22, gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}><Icon name="trash" size={22} color={theme.up} /></View>
            <Txt size={19} w={700} display ls={-0.3}>{t.resetTitle}</Txt>
            <Txt size={14} color={theme.muted} lh={20}>{t.resetBody}</Txt>
            {resetFailed ? <Txt size={13} w={600} color={theme.up}>{t.toastError}</Txt> : null}
            <View style={{ gap: 10, marginTop: 6 }}>
              <Press onPress={doReset} style={{ height: 50, borderRadius: 16, backgroundColor: theme.danger, alignItems: 'center', justifyContent: 'center' }}><Txt size={15} w={700} color="#FFFFFF">{t.resetConfirm}</Txt></Press>
              <Press onPress={() => { setConfirming(false); setResetFailed(false); }} style={{ height: 50, borderRadius: 16, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}><Txt size={15} w={700}>{t.cancel}</Txt></Press>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ alignItems: 'center', gap: 6, paddingVertical: 16 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.hero, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={28} w={800} display color={theme.lime} style={{ marginTop: -4 }}>f</Txt>
        </View>
        <Txt size={18} w={800} display ls={-0.5}>floosy · فلوسي</Txt>
        <Txt size={13} color={theme.muted}>{t.tagline}</Txt>
        <Press onPress={editProfile} style={{ minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' }}><Txt size={14} w={600} color={theme.brandText}>{t.editProfile}</Txt></Press>
      </View>
    </Screen>
  );
}
