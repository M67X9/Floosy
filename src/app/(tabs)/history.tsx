import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Calendar } from '../../components/Calendar';
import { TxRow } from '../../components/parts';
import { Screen } from '../../components/Screen';
import { Card, FilterChip, Icon, IconBtn, Press, Seg, Txt } from '../../components/ui';
import { addDays, relLabel } from '../../lib/dates';
import { CATS, type CatId } from '../../lib/i18n';
import { moneyOf } from '../../lib/money';
import { filterTxs, sum, type FilterRange, type Sort } from '../../lib/selectors';
import { useStore } from '../../lib/store';

export default function History() {
  const { lang, t, theme, today, txs } = useStore();
  const money = moneyOf(lang);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<CatId | 'all'>('all');
  const [range, setRange] = useState<FilterRange>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<Sort>('new');
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(40);
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  const list = useMemo(() => filterTxs(txs, { q, cat, range, from, to, sort }, today), [txs, q, cat, range, from, to, sort, today]);
  const shown = list.slice(0, limit);
  const active = (cat !== 'all' ? 1 : 0) + (range !== 'all' ? 1 : 0);

  const groups = useMemo(() => {
    if (sort === 'high') return shown.length ? [{ label: t.highestFirst, total: '', rows: shown }] : [];
    const order: string[] = [], m: Record<string, typeof shown> = {};
    shown.forEach((x) => { if (!m[x.date]) { m[x.date] = []; order.push(x.date); } m[x.date].push(x); });
    return order.map((d) => ({ label: relLabel(lang, d, today), total: money(sum(txs.filter((x) => x.date === d && (cat === 'all' || x.cat === cat)))), rows: m[d] }));
  }, [shown, sort, txs, cat, lang, today, t.highestFirst, money]);

  const resetFilters = () => { setCat('all'); setRange('all'); setFrom(''); setTo(''); setLimit(40); setPicking(null); };
  const pickRange = (r: FilterRange) => {
    setRange(r); setLimit(40);
    if (r === 'custom') { if (!from) setFrom(addDays(today, -13)); if (!to) setTo(today); }
  };

  const dateBtn = (which: 'from' | 'to', label: string, value: string) => (
    <Press onPress={() => setPicking(picking === which ? null : which)} style={{ flex: 1, gap: 6 }}>
      <Txt size={13} w={600} color={theme.muted}>{label}</Txt>
      <View style={{ height: 44, borderRadius: 14, borderWidth: 1, borderColor: picking === which ? theme.brandText : theme.line, backgroundColor: theme.surface2, paddingHorizontal: 14, justifyContent: 'center' }}>
        <Txt size={14} num ltr>{value}</Txt>
      </View>
    </Press>
  );

  return (
    <Screen gap={14}>
      <View style={{ gap: 4 }}>
        <Txt size={30} w={700} display ls={-0.75} lh={34}>{t.txTitle}</Txt>
        <Txt size={13} color={theme.muted}>{list.length + ' ' + t.expenses + ' · ' + money(sum(list))}</Txt>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingStart: 14, paddingEnd: 6, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line }}>
          <Icon name="search" size={18} color={theme.muted} />
          <TextInput value={q} onChangeText={(v) => { setQ(v); setLimit(40); }} placeholder={t.searchPh} placeholderTextColor={theme.muted} accessibilityLabel={t.searchPh} returnKeyType="search"
            style={{ flex: 1, minWidth: 0, height: 40, padding: 0, fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 15, color: theme.ink, textAlign: lang === 'ar' ? 'right' : 'left' }} />
          {q.trim() ? (
            <Press label={t.clear} onPress={() => setQ('')} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={16} /></Press>
          ) : null}
        </View>
        <View>
          <IconBtn icon="filter" label={t.filters} onPress={() => setOpen(!open)} size={46}
            style={open || active ? { backgroundColor: theme.ink, borderColor: theme.ink } : undefined} />
          {active ? (
            <View pointerEvents="none" style={{ position: 'absolute', top: -5, end: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={11} w={700} color={theme.brandInk}>{String(active)}</Txt>
            </View>
          ) : null}
        </View>
      </View>

      <Seg label={t.sortBy} value={sort} onChange={(s) => { setSort(s); setLimit(40); }} options={[['new', t.sortNew], ['old', t.sortOld], ['high', t.sortHigh]]} />

      {open ? (
        <Card flat style={{ padding: 16, gap: 14 }}>
          <View style={{ gap: 8 }}>
            <Txt size={13} w={600} color={theme.muted}>{t.category}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <FilterChip label={t.all} on={cat === 'all'} onPress={() => { setCat('all'); setLimit(40); }} />
              {CATS.map((c) => <FilterChip key={c.id} label={c[lang]} dot={c.color} on={cat === c.id} onPress={() => { setCat(c.id); setLimit(40); }} />)}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Txt size={13} w={600} color={theme.muted}>{t.dateRange}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {([['all', t.allTime], ['7d', t.last7], ['month', t.thisMonth], ['last', t.lastMonth], ['custom', t.custom]] as [FilterRange, string][]).map(([k, label]) => (
                <FilterChip key={k} label={label} on={range === k} onPress={() => pickRange(k)} />
              ))}
            </View>
          </View>
          {range === 'custom' ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>{dateBtn('from', t.from, from)}{dateBtn('to', t.to, to)}</View>
              {picking ? <Calendar quick={false} value={(picking === 'from' ? from : to) || today} onPick={(iso) => { if (picking === 'from') setFrom(iso); else setTo(iso); setPicking(null); setLimit(40); }} /> : null}
            </View>
          ) : null}
          {active ? <Press onPress={resetFilters} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}><Txt size={14} w={600} color={theme.brandText}>{t.resetFilters}</Txt></Press> : null}
        </Card>
      ) : null}

      {groups.map((g) => (
        <View key={g.label} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 }}>
            <Txt size={13} w={700} color={theme.muted}>{g.label}</Txt>
            <Txt size={13} color={theme.muted} ltr>{g.total}</Txt>
          </View>
          <Card flat style={{ padding: 6 }}>{g.rows.map((x) => <TxRow key={x.id} x={x} />)}</Card>
        </View>
      ))}

      {list.length === 0 ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}><Icon name="search" size={28} color={theme.muted} /></View>
          <Txt size={17} w={700}>{t.emptyTitle}</Txt>
          <Txt size={14} color={theme.muted} align="center" lh={20} style={{ maxWidth: 240 }}>{t.emptyBody}</Txt>
          <Press onPress={() => { setQ(''); resetFilters(); }} style={{ marginTop: 6, height: 44, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, justifyContent: 'center' }}><Txt size={14} w={600}>{t.resetFilters}</Txt></Press>
        </View>
      ) : null}
      {list.length > limit ? (
        <Press onPress={() => setLimit(limit + 40)} style={{ height: 48, borderRadius: 16, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }}><Txt size={14} w={600}>{t.showMore}</Txt></Press>
      ) : null}
    </Screen>
  );
}
