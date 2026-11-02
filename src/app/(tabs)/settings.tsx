import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Card, Chev, Icon, Press, Seg, Txt } from '../../components/ui';
import { useUI } from '../../components/ui-state';
import type { IconName } from '../../lib/icons';
import { moneyOf } from '../../lib/money';
import { useStore } from '../../lib/store';

export default function Settings() {
  const { lang, t, theme, profile, budget, setLang, dark, setDark } = useStore();
  const { editProfile } = useUI();
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

  return (
    <Screen>
      <Txt size={30} w={700} display ls={-0.75} lh={34}>{t.setTitle}</Txt>

      <Card flat style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.hero, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={22} w={700} display color={theme.lime}>{name.trim().charAt(0).toUpperCase()}</Txt>
        </View>
        <View style={{ gap: 2 }}>
          <Txt size={17} w={700}>{name}</Txt>
          <Txt size={13} color={theme.muted}>{t.profileSub}</Txt>
        </View>
      </Card>

      <Card flat style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
        {row('lang', t.language, <Seg label={t.language} style={{ width: 170 }} value={lang} onChange={setLang} options={[['en', 'English'], ['ar', 'العربية']]} />, { pad: 12 })}
        {row('moon', t.appearance, <Seg label={t.appearance} style={{ width: 170 }} value={dark} onChange={setDark} options={[[false, t.light], [true, t.dark]]} />, { pad: 12 })}
        {row('target', t.budget, <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Txt size={14} color={theme.muted} ltr>{money(budget)}</Txt><Chev dir="R" size={18} color={theme.muted} /></View>, { onPress: () => router.navigate('/budget') })}
        {row('up', t.income, <Txt size={14} color={theme.muted} ltr>{profile && profile.income > 0 ? money(profile.income) : '—'}</Txt>)}
        {row('wallet', t.currency, <Txt size={14} color={theme.muted}>{t.kwd}</Txt>, { last: true })}
      </Card>

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
