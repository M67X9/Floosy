import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { shortDate } from '../lib/dates';
import { f3 } from '../lib/money';
import { catOf } from '../lib/selectors';
import { useStore } from '../lib/store';
import { soft } from '../lib/theme';
import type { Tx } from '../lib/types';
import { Icon, Press, Txt } from './ui';
import type { CatId } from '../lib/i18n';
import { useUI } from './ui-state';

export function CatBadge({ cat, size = 44, icon = 20, radius = 14 }: { cat: CatId; size?: number; icon?: number; radius?: number }) {
  const { theme, lang } = useStore();
  const c = catOf(cat);
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: soft(c.color, theme.dark), alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={cat} size={icon} color={c.color} />
    </View>
  );
}

export function TxRow({ x }: { x: Tx }) {
  const { lang, t, theme } = useStore();
  const { openDetail, flashId } = useUI();
  const c = catOf(x.cat);
  return (
    <Press onPress={() => openDetail(x.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: x.id === flashId ? theme.flash : 'transparent' }}>
      <CatBadge cat={x.cat} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt size={15} w={600} lines={1}>{(lang === 'ar' ? x.ar : x.en) || t.noDesc}</Txt>
        <Txt size={12.5} color={theme.muted} lines={1}>{c[lang] + ' · ' + shortDate(lang, x.date)}</Txt>
      </View>
      <Txt size={15} w={700} num ltr>{f3(x.amount)}</Txt>
    </Press>
  );
}

export type DonutSeg = { id: string; color: string; amt: number };
export function Donut({ segs, total, sel, onPick }: { segs: DonutSeg[]; total: number; sel: string | null; onPick: (id: string) => void }) {
  const { theme } = useStore();
  const R = 62, C = 2 * Math.PI * R, gap = segs.length > 1 ? 2.2 : 0;
  let off = 0;
  return (
    <Svg width="100%" height="100%" viewBox="0 0 160 160">
      <G transform="rotate(-90 80 80)">
        <Circle cx={80} cy={80} r={R} stroke={theme.surface2} strokeWidth={18} fill="none" />
        {segs.map((c) => {
          const full = (c.amt / total) * C, len = Math.max(full - gap, 0.6);
          const el = (
            <Circle
              key={c.id} cx={80} cy={80} r={R} fill="none" stroke={c.color} strokeWidth={sel === c.id ? 22 : 18}
              strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`} strokeDashoffset={-off}
              opacity={sel && sel !== c.id ? 0.25 : 1} onPress={() => onPick(c.id)}
            />
          );
          off += full;
          return el;
        })}
      </G>
    </Svg>
  );
}
