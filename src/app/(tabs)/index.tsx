import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Donut, TxRow } from '../../components/parts';
import { Screen } from '../../components/Screen';
import { Bar, Card, Icon, Press, Seg, Skeleton, StatusChip, Txt, kindColor } from '../../components/ui';
import { kuwaitHour } from '../../lib/dates';
import { curOf, f3, moneyOf } from '../../lib/money';
import { breakdown, budgetKind, monthStats, pctOf, sortDesc, type Range } from '../../lib/selectors';
import { useStore } from '../../lib/store';
import { fmtDate } from '../../lib/dates';

// Counts the hero number up, like the prototype.
function useCountUp(target: number, enabled: boolean) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const start = from.current, t0 = Date.now(), dur = 800;
    let raf = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      setShown(start + (target - start) * e);
      if (p < 1) raf = requestAnimationFrame(step); else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled]);
  return shown;
}

export default function Home() {
  const { lang, t, theme, today, txs, profile, budget } = useStore();
  const money = moneyOf(lang), cur = curOf(lang);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('month');
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => { const id = setTimeout(() => setLoading(false), 900); return () => clearTimeout(id); }, []);

  const ms = useMemo(() => monthStats(txs, today), [txs, today]);
  const bd = useMemo(() => breakdown(ms, today, range), [ms, today, range]);
  const recent = useMemo(() => ms.past.slice().sort(sortDesc).slice(0, 5), [ms.past]);
  const count = useCountUp(ms.monthTotal, !loading);

  const monthName = fmtDate(lang, ms.ym + '-01', { month: 'long' });
  const sh = f3(count), dot = sh.lastIndexOf('.');
  const up = ms.change > 0;
  const hour = kuwaitHour();
  const greeting = hour < 12 ? t.gMorning : hour < 18 ? t.gAfternoon : t.gEvening;
  const name = profile?.name || t.friend;

  const bP = ms.monthTotal / budget, bKind = budgetKind(bP);
  const statusText = bKind === 'over' ? t.over : bKind === 'near' ? t.near : t.onTrack;
  const selC = sel ? bd.byCat.find((c) => c.id === sel) : null;
  const rangeName = range === 'week' ? t.thisWeek : range === 'month' ? t.thisMonth : lang === 'ar' ? 'هذه السنة' : 'This year';
  const stats: [string, number][] = [[t.today, ms.todayTotal], [t.thisWeek, ms.weekTotal], [t.thisMonth, ms.monthTotal], [t.avgDay, ms.avgDay]];
  const pick = (id: string) => setSel(sel === id ? null : id);

  return (
    <Screen top={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.hero, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={24} w={800} display color={theme.lime} style={{ marginTop: -3 }}>f</Txt>
          </View>
          <View>
            <Txt size={21} w={800} display ls={-0.6} lh={22}>floosy</Txt>
            <Txt size={11} color={theme.muted}>فلوسي</Txt>
          </View>
        </View>
        <Press label={t.profile} onPress={() => router.navigate('/settings')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={16} w={700} display>{(profile?.name || '?').trim().charAt(0).toUpperCase()}</Txt>
        </Press>
      </View>

      <View style={{ gap: 2 }}>
        <Txt size={14} color={theme.muted}>{greeting}</Txt>
        <Txt size={26} w={700} display ls={-0.5}>{name}</Txt>
      </View>

      {loading ? (
        <View style={{ gap: 16 }} accessibilityState={{ busy: true }}>
          <Skeleton height={178} radius={28} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => <View key={i} style={{ width: '48%' }}><Skeleton height={76} /></View>)}
          </View>
          <Skeleton height={300} radius={24} />
        </View>
      ) : (
        <>
          <View style={{ overflow: 'hidden', borderRadius: 28, backgroundColor: theme.hero, padding: 22, gap: 14 }}>
            <View pointerEvents="none" style={{ position: 'absolute', top: -80, end: -70, opacity: 0.2 }}>
              <Svg width={240} height={240} viewBox="0 0 200 200" fill="none" stroke={theme.lime} strokeWidth={1}>
                {[36, 56, 76, 96].map((r) => <Circle key={r} cx={100} cy={100} r={r} />)}
              </Svg>
            </View>
            <Txt size={14} color={theme.heroMuted}>{lang === 'ar' ? 'مصروفات ' + monthName + ' ' + today.slice(0, 4) : 'Spent in ' + monthName + ' ' + today.slice(0, 4)}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Txt size={46} w={700} num ltr ls={-1.6} color={theme.heroInk}>{sh.slice(0, dot)}<Txt size={26} w={700} num color={theme.heroMuted}>{sh.slice(dot)}</Txt></Txt>
              <Txt size={16} w={700} color={theme.lime}>{cur}</Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: up ? 'rgba(253,186,116,.16)' : 'rgba(201,242,107,.16)' }}>
                <Icon name={up ? 'up' : 'down'} size={16} color={up ? '#FDBA74' : '#C9F26B'} />
                <Txt size={13} w={700} ltr color={up ? '#FDBA74' : '#C9F26B'}>{(up ? '+' : '−') + Math.abs(ms.change).toFixed(1) + '%'}</Txt>
              </View>
              <Txt size={13} color={theme.heroMuted}>{t.vsSame}</Txt>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {stats.map(([label, v]) => (
              <Card key={label} flat style={{ width: '48%', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, gap: 6 }}>
                <Txt size={13} color={theme.muted}>{label}</Txt>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                  <Txt size={21} w={700} num ltr>{f3(v)}</Txt>
                  <Txt size={12} color={theme.muted}>{cur}</Txt>
                </View>
              </Card>
            ))}
          </View>

          <Card style={{ padding: 18, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}><Txt size={17} w={700} ls={-0.2}>{t.breakdown}</Txt></View>
              <Seg label={t.period} value={range} onChange={(r) => { setRange(r); setSel(null); }} options={[['week', t.week], ['month', t.month], ['year', t.year]]} style={{ flexShrink: 0 }} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 184, height: 184 }} accessibilityLabel={t.breakdown + ': ' + bd.byCat.map((c) => c[lang] + ' ' + pctOf(c.amt, bd.tot)).join(', ')}>
                {bd.byCat.length ? <Donut segs={bd.byCat} total={bd.tot} sel={sel} onPick={pick} /> : <Donut segs={[]} total={1} sel={null} onPick={() => {}} />}
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Txt size={12} color={theme.muted} lh={15} align="center" style={{ maxWidth: 112 }}>{selC ? selC[lang] : t.total}</Txt>
                  <Txt size={22} w={700} num ltr>{f3(selC ? selC.amt : bd.tot)}</Txt>
                  <Txt size={12} color={theme.muted}>{selC ? pctOf(selC.amt, bd.tot) : rangeName}</Txt>
                </View>
              </View>
            </View>
            <View style={{ gap: 2 }}>
              {bd.byCat.map((c) => (
                <Press key={c.id} selected={sel === c.id} onPress={() => pick(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 12, backgroundColor: sel === c.id ? theme.surface2 : 'transparent', opacity: sel && sel !== c.id ? 0.55 : 1 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color }} />
                  <View style={{ flex: 1 }}><Txt size={14} lines={1}>{c[lang]}</Txt></View>
                  <Txt size={13} color={theme.muted} ltr>{pctOf(c.amt, bd.tot)}</Txt>
                  <Txt size={14} w={700} num ltr style={{ minWidth: 76, textAlign: 'right' }}>{f3(c.amt)}</Txt>
                </Press>
              ))}
              {bd.byCat.length === 0 ? <Txt size={14} color={theme.muted} align="center" style={{ padding: 8 }}>{t.noSpendPeriod}</Txt> : null}
            </View>
          </Card>

          <Press onPress={() => router.navigate('/budget')} style={{ width: '100%' }}>
            <Card style={{ padding: 18, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="target" size={18} /><Txt size={16} w={700}>{t.budget}</Txt></View>
                <StatusChip kind={bKind} text={statusText} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                <Txt size={22} w={700} num ltr>{money(ms.monthTotal)}</Txt>
                <Txt size={13} color={theme.muted}>{(lang === 'ar' ? 'من ' : 'of ') + money(budget)}</Txt>
              </View>
              <Bar pct={bP} height={10} color={kindColor(bKind, theme)} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt size={13} color={theme.muted}>{bP >= 1 ? t.overBy + ' ' + money(ms.monthTotal - budget) : money(budget - ms.monthTotal) + (lang === 'ar' ? ' متبقية' : ' left')}</Txt>
                <Txt size={13} color={theme.muted} ltr>{Math.round(bP * 100) + '%'}</Txt>
              </View>
            </Card>
          </Press>

          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Txt size={17} w={700} ls={-0.2}>{t.recent}</Txt>
              <Press onPress={() => router.navigate('/history')} style={{ minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' }}><Txt size={14} w={600} color={theme.brandText}>{t.seeAll}</Txt></Press>
            </View>
            <Card flat style={{ padding: 6 }}>{recent.map((x) => <TxRow key={x.id} x={x} />)}</Card>
          </View>
        </>
      )}
    </Screen>
  );
}
