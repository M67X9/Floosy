import { useState } from 'react';
import { View } from 'react-native';
import { addDays, addMonths, D, daysIn, fmtDate, friendly } from '../lib/dates';
import { useStore } from '../lib/store';
import { Chev, Press, Txt } from './ui';

const DOWS = { en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'], ar: ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] };

export function Calendar({ value, onPick, quick = true }: { value: string; onPick: (iso: string) => void; quick?: boolean }) {
  const { lang, t, theme, today } = useStore();
  const [cm, setCm] = useState(value.slice(0, 7));
  const sd = D(cm + '-01').getUTCDay(), dim = daysIn(cm);
  const cells: (number | null)[] = [];
  for (let i = 0; i < sd; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  const nav = { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' } as const;
  const pill = { height: 36, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, justifyContent: 'center' } as const;

  return (
    <View style={{ borderWidth: 1, borderColor: theme.line, borderRadius: 18, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Press label={t.prevMonth} onPress={() => setCm(addMonths(cm, -1))} style={nav}><Chev dir="L" size={18} /></Press>
        <Txt size={15} w={700}>{fmtDate(lang, cm + '-01', { month: 'long', year: 'numeric' })}</Txt>
        <Press label={t.nextMonth} onPress={() => setCm(addMonths(cm, 1))} style={nav}><Chev dir="R" size={18} /></Press>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {DOWS[lang].map((w, i) => <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}><Txt size={11} w={600} color={theme.muted}>{w}</Txt></View>)}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 2 }}>
          {r.map((d, ci) => {
            if (!d) return <View key={ci} style={{ flex: 1 }} />;
            const iso = cm + '-' + (d < 10 ? '0' : '') + d, on = iso === value, isT = iso === today;
            return (
              <Press key={ci} label={friendly(lang, iso, today)} selected={on} onPress={() => onPick(iso)} style={{ flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? theme.brand : 'transparent', borderWidth: isT && !on ? 1.5 : 0, borderColor: theme.brandText }}>
                <Txt size={14} w={on || isT ? 700 : 500} num color={on ? theme.brandInk : isT ? theme.brandText : theme.ink}>{String(d)}</Txt>
              </Press>
            );
          })}
        </View>
      ))}
      {quick ? (
        <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
          <Press onPress={() => onPick(today)} style={pill}><Txt size={13} w={600}>{t.today}</Txt></Press>
          <Press onPress={() => onPick(addDays(today, -1))} style={pill}><Txt size={13} w={600}>{t.yesterday}</Txt></Press>
        </View>
      ) : null}
    </View>
  );
}
