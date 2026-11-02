import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { CatBadge } from '../../components/parts';
import { Screen } from '../../components/Screen';
import { Bar, Card, Chev, Icon, Press, StatusChip, Txt, kindColor } from '../../components/ui';
import { fmtDate } from '../../lib/dates';
import { CATS } from '../../lib/i18n';
import { curOf, f3, moneyOf } from '../../lib/money';
import { budgetKind, monthStats, sum } from '../../lib/selectors';
import { useStore } from '../../lib/store';

export default function Budget() {
  const { lang, t, theme, today, txs, budget, catBudgets, setBudget } = useStore();
  const money = moneyOf(lang), cur = curOf(lang);
  const ms = useMemo(() => monthStats(txs, today), [txs, today]);
  const bP = ms.monthTotal / budget, kind = budgetKind(bP);
  const pace = (ms.dom / ms.dim) * 100;
  const status = kind === 'over' ? t.over : kind === 'near' ? t.near : t.onTrack;
  const monthName = fmtDate(lang, ms.ym + '-01', { month: 'long' });
  const heroBar = kind === 'over' ? '#FDBA74' : kind === 'near' ? '#FCD34D' : theme.lime;
  const stepBtn = { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' } as const;

  const cats = CATS.filter((c) => catBudgets[c.id]).map((c) => {
    const b = catBudgets[c.id]!, spent = sum(ms.monthTx.filter((x) => x.cat === c.id)), p = spent / b;
    return { c, b, spent, p, k: budgetKind(p) };
  });

  return (
    <Screen top={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Press label={t.back} onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}><Chev dir="L" size={20} /></Press>
        <Txt size={26} w={700} display ls={-0.65}>{t.budgetTitle}</Txt>
      </View>

      <View style={{ borderRadius: 28, backgroundColor: theme.hero, padding: 22, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt size={14} color={theme.heroMuted}>{bP >= 1 ? t.overBy : t.remaining}</Txt>
          <StatusChip kind={kind} text={status} onHero />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Txt size={42} w={700} num ltr color={theme.heroInk} lh={44}>{f3(Math.abs(budget - ms.monthTotal))}</Txt>
          <Txt size={16} w={700} color={theme.lime}>{cur}</Txt>
        </View>
        <View style={{ height: 12 }}>
          <Bar pct={bP} height={12} color={heroBar} track="rgba(255,255,255,.14)" />
          <View accessibilityLabel={t.pace} pointerEvents="none" style={{ position: 'absolute', top: -4, bottom: -4, start: 0, end: 0, flexDirection: 'row' }}>
            <View style={{ width: `${pace}%`, marginStart: -1 }} />
            <View style={{ width: 3, borderRadius: 2, backgroundColor: '#FFFFFF' }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Txt size={13} color={theme.heroMuted}>{t.spent + ' '}<Txt size={13} w={600} color={theme.heroInk} ltr>{money(ms.monthTotal)}</Txt></Txt>
          <Txt size={13} color={theme.heroMuted}>{lang === 'ar' ? 'متبقي ' + (ms.dim - ms.dom) + ' يوماً' : ms.dim - ms.dom + ' days left in ' + monthName}</Txt>
        </View>
        <Txt size={12} color={theme.heroMuted}>{t.paceNote}</Txt>
      </View>

      <Card flat style={{ paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ gap: 2, flex: 1 }}>
          <Txt size={15} w={700}>{t.budget}</Txt>
          <Txt size={12.5} color={theme.muted}>{t.adjust}</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Press label={t.decrease} onPress={() => setBudget(Math.max(50, budget - 25))} style={stepBtn}><Icon name="minus" size={18} /></Press>
          <View style={{ minWidth: 74, alignItems: 'center' }} accessibilityLiveRegion="polite"><Txt size={17} w={700} num ltr>{budget.toLocaleString('en-US')}</Txt></View>
          <Press label={t.increase} onPress={() => setBudget(budget + 25)} style={stepBtn}><Icon name="plus" size={18} /></Press>
        </View>
      </Card>

      <View style={{ gap: 8 }}>
        <Txt size={17} w={700} ls={-0.2} style={{ paddingHorizontal: 4 }}>{t.catBudgets}</Txt>
        <Card flat style={{ paddingVertical: 6, paddingHorizontal: 14 }}>
          {cats.map(({ c, b, spent, p, k }, i) => (
            <View key={c.id} style={{ gap: 10, paddingVertical: 12, borderBottomWidth: i < cats.length - 1 ? 1 : 0, borderBottomColor: theme.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <CatBadge cat={c.id} size={38} icon={18} radius={12} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Txt size={14.5} w={600}>{c[lang]}</Txt>
                  <Txt size={12.5} color={theme.muted} ltr>{f3(spent) + ' / ' + f3(b) + ' ' + cur}</Txt>
                </View>
                <StatusChip kind={k} text={k === 'over' ? (lang === 'ar' ? 'تجاوز' : 'Over') : Math.round(p * 100) + '%'} />
              </View>
              <Bar pct={p} color={k === 'ok' ? c.color : kindColor(k, theme)} />
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}
