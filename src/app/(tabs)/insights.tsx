import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { CatBadge } from '../../components/parts';
import { Screen } from '../../components/Screen';
import { Bar, Card, Icon, Txt } from '../../components/ui';
import { fmtDate, shortDate } from '../../lib/dates';
import { f3, moneyOf } from '../../lib/money';
import { CHART_H, CHART_W, catOf, insights, monthStats, sum } from '../../lib/selectors';
import { useStore } from '../../lib/store';

export default function Insights() {
  const { lang, t, theme, today, txs, profile } = useStore();
  const money = moneyOf(lang);
  const ms = useMemo(() => monthStats(txs, today), [txs, today]);
  const ins = useMemo(() => insights(txs, ms, today, profile?.income ?? 0, lang), [txs, ms, today, profile, lang]);
  const weekAvg = sum(ins.fullWeeks.map((w) => ({ amount: w.total }))) / ins.fullWeeks.length;
  const diffUp = ins.avgDiff > 0;
  const { highTx } = ins;

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Txt size={30} w={700} display ls={-0.75} lh={34}>{t.insTitle}</Txt>
        <Txt size={14} color={theme.muted}>{t.insSub}</Txt>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 24, backgroundColor: theme.hero, paddingVertical: 18, paddingHorizontal: 20 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.lime, alignItems: 'center', justifyContent: 'center' }}><Icon name="spark" size={18} color="#0B1F18" /></View>
        <View style={{ flex: 1, gap: 6 }}>
          {ins.sentences.map((s, i) => <Txt key={i} size={14.5} lh={21} color={theme.heroInk}>{s}</Txt>)}
        </View>
      </View>

      <Card style={{ padding: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ gap: 2 }}>
            <Txt size={17} w={700} ls={-0.2}>{t.trend}</Txt>
            <Txt size={12.5} color={theme.muted}>{t.last12}</Txt>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Txt size={17} w={700} num ltr>{money(weekAvg)}</Txt>
            <Txt size={12} color={theme.muted}>{t.avgWeek}</Txt>
          </View>
        </View>
        <View style={{ direction: 'ltr' }} accessibilityLabel={t.trend + ', ' + t.last12}>
          <Svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ aspectRatio: CHART_W / CHART_H, overflow: 'visible' }}>
            <Line x1={0} x2={CHART_W} y1={14} y2={14} stroke={theme.line} strokeWidth={1} strokeDasharray="3 4" />
            <Line x1={0} x2={CHART_W} y1={70} y2={70} stroke={theme.line} strokeWidth={1} strokeDasharray="3 4" />
            <Line x1={0} x2={CHART_W} y1={126} y2={126} stroke={theme.line} strokeWidth={1} />
            <Path d={ins.area} fill={theme.brandText} opacity={0.1} />
            <Path d={ins.line} fill="none" stroke={theme.brandText} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={ins.lastP[0]} cy={ins.lastP[1]} r={5} fill={theme.surface} stroke={theme.brandText} strokeWidth={2.5} />
          </Svg>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 }}>
            {[shortDate(lang, ins.weeks[0].ws), shortDate(lang, ins.weeks[6].ws), t.thisWeek].map((x, i) => <Txt key={i} size={11.5} color={theme.muted}>{x}</Txt>)}
          </View>
        </View>
      </Card>

      <Card style={{ padding: 18, gap: 14 }}>
        <Txt size={17} w={700} ls={-0.2}>{t.monthly}</Txt>
        <View style={{ direction: 'ltr', flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 170 }}>
          {ins.months.map((m, i) => {
            const cur = i === ins.months.length - 1, h = Math.max(6, Math.round((m.total / ins.maxM) * 110));
            return (
              <View key={m.m} style={{ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%' }}>
                <Txt size={11.5} w={700} num color={cur ? theme.ink : theme.muted}>{Math.round(m.total).toLocaleString('en-US')}</Txt>
                <View style={{ width: '100%', maxWidth: 36, height: h, borderTopStartRadius: 10, borderTopEndRadius: 10, borderBottomStartRadius: 4, borderBottomEndRadius: 4, backgroundColor: cur ? theme.brand : theme.surface2, borderWidth: cur ? 0 : 1, borderColor: theme.line }} />
                <Txt size={12} w={cur ? 700 : 500} color={cur ? theme.ink : theme.muted}>{fmtDate(lang, m.m + '-01', { month: 'short' })}</Txt>
              </View>
            );
          })}
        </View>
        <Txt size={12} color={theme.muted}>{(lang === 'ar' ? 'الشهر الحالي ' : 'Current month ') + t.soFar + ' · ' + money(ms.monthTotal)}</Txt>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card flat style={{ flex: 1, padding: 16, gap: 8, borderRadius: 20 }}>
          <Txt size={12.5} color={theme.muted} lh={16}>{t.highest}</Txt>
          <Txt size={20} w={700} num ltr>{highTx ? money(highTx.amount) : '—'}</Txt>
          <Txt size={13} w={600} lines={1}>{highTx ? (lang === 'ar' ? highTx.ar : highTx.en) || t.noDesc : t.nothingYet}</Txt>
          <Txt size={12} color={theme.muted}>{highTx ? catOf(highTx.cat)[lang] + ' · ' + shortDate(lang, highTx.date) : ''}</Txt>
        </Card>
        <Card flat style={{ flex: 1, padding: 16, gap: 8, borderRadius: 20 }}>
          <Txt size={12.5} color={theme.muted} lh={16}>{t.avgDay}</Txt>
          <Txt size={20} w={700} num ltr>{money(ms.avgDay)}</Txt>
          <Txt size={13} w={600}>{t.lastMonth + ': ' + f3(ins.prevAvg)}</Txt>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, backgroundColor: theme.surface2 }}>
            <Txt size={12} w={700} ltr color={diffUp ? theme.up : theme.down}>{(diffUp ? '+' : '−') + Math.abs(ins.avgDiff).toFixed(0) + '%'}</Txt>
          </View>
        </Card>
      </View>

      <Card style={{ padding: 18, gap: 14 }}>
        <View style={{ gap: 2 }}>
          <Txt size={17} w={700} ls={-0.2}>{t.top}</Txt>
          <Txt size={12.5} color={theme.muted}>{t.last30}</Txt>
        </View>
        {ins.top5.length === 0 ? <Txt size={14} color={theme.muted}>{t.nothingYet}</Txt> : null}
        {ins.top5.map((c, i) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <CatBadge cat={c.id} size={36} icon={18} radius={12} />
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Txt size={14} w={600}>{c[lang]}</Txt>
                <Txt size={14} w={700} num ltr>{money(c.amt)}</Txt>
              </View>
              <Bar pct={c.amt / ins.maxC} color={c.color} delay={i * 80} />
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
