import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { ICONS, type IconName } from '../lib/icons';
import { useStore } from '../lib/store';

/* ---------- fonts ---------- */
// Bricolage Grotesque has no Arabic glyphs, so Arabic text falls back to IBM Plex Sans Arabic.
const AR = /[؀-ۿ]/;
type W = 400 | 500 | 600 | 700 | 800;
const DISPLAY: Record<number, string> = { 400: 'BricolageGrotesque_500Medium', 500: 'BricolageGrotesque_500Medium', 600: 'BricolageGrotesque_700Bold', 700: 'BricolageGrotesque_700Bold', 800: 'BricolageGrotesque_800ExtraBold' };
const BODY: Record<number, string> = { 400: 'IBMPlexSansArabic_400Regular', 500: 'IBMPlexSansArabic_500Medium', 600: 'IBMPlexSansArabic_600SemiBold', 700: 'IBMPlexSansArabic_700Bold', 800: 'IBMPlexSansArabic_700Bold' };

function textOf(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textOf).join('');
  return '';
}

type TxtProps = {
  children?: ReactNode; size?: number; w?: W; color?: string; display?: boolean; num?: boolean; ls?: number;
  lh?: number; align?: TextStyle['textAlign']; ltr?: boolean; lines?: number; style?: StyleProp<TextStyle>;
};

export function Txt({ children, size = 14, w = 400, color, display, num, ls, lh, align, ltr, lines, style }: TxtProps) {
  const { theme } = useStore();
  const arabic = AR.test(textOf(children));
  const useDisplay = (display || num) && !arabic;
  return (
    <Text
      numberOfLines={lines}
      style={[
        {
          fontFamily: (useDisplay ? DISPLAY : BODY)[w], fontSize: size, color: color ?? theme.ink,
          letterSpacing: arabic ? 0 : ls, lineHeight: lh, textAlign: align,
          writingDirection: ltr ? 'ltr' : undefined
        },
        num && { fontVariant: ['tabular-nums'] },
        style
      ]}
    >
      {children}
    </Text>
  );
}

/* ---------- icons ---------- */
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { theme } = useStore();
  const c = color ?? theme.ink;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={size >= 28 ? 1.75 : 2} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name].map(([tag, a], i) => {
        const p = a as Record<string, string>;
        switch (tag) {
          case 'path': return <Path key={i} d={p.d} />;
          case 'circle': return <Circle key={i} cx={p.cx} cy={p.cy} r={p.r} />;
          case 'line': return <Line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} />;
          case 'rect': return <Rect key={i} x={p.x} y={p.y} width={p.width} height={p.height} rx={p.rx} />;
          default: return <Polyline key={i} points={p.points} />;
        }
      })}
    </Svg>
  );
}

// Direction-aware chevron (mirrors in RTL).
export function Chev({ dir, size = 20, color }: { dir: 'L' | 'R' | 'D'; size?: number; color?: string }) {
  const { rtl } = useStore();
  const flip = rtl && dir !== 'D';
  return <View style={flip ? { transform: [{ scaleX: -1 }] } : undefined}><Icon name={dir === 'L' ? 'chevL' : dir === 'R' ? 'chevR' : 'chevD'} size={size} color={color} /></View>;
}

/* ---------- pressables & surfaces ---------- */
type PressProps = { onPress?: () => void; style?: StyleProp<ViewStyle>; children?: ReactNode; label?: string; role?: 'button' | 'radio' | 'link'; selected?: boolean; disabled?: boolean };
export function Press({ onPress, style, children, label, role = 'button', selected, disabled }: PressProps) {
  return (
    <Pressable
      onPress={onPress} accessibilityRole={role} accessibilityLabel={label} accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [style, pressed && { transform: [{ scale: 0.96 }] }]}
    >
      {children}
    </Pressable>
  );
}

export function Card({ children, style, flat }: { children?: ReactNode; style?: StyleProp<ViewStyle>; flat?: boolean }) {
  const { theme } = useStore();
  return (
    <View
      style={[
        { backgroundColor: theme.surface, borderColor: theme.line, borderWidth: 1, borderRadius: 24 },
        !flat && !theme.dark && { shadowColor: '#0E1D19', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
        style
      ]}
    >
      {children}
    </View>
  );
}

export function IconBtn({ icon, label, onPress, size = 44, style }: { icon: IconName; label: string; onPress: () => void; size?: number; style?: StyleProp<ViewStyle> }) {
  const { theme } = useStore();
  return (
    <Press onPress={onPress} label={label} style={[{ width: size, height: size, borderRadius: size > 40 ? 14 : 12, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon name={icon} size={18} />
    </Press>
  );
}

export function Seg<T extends string | boolean>({ options, value, onChange, label, style, onHero }: { options: [T, string][]; value: T; onChange: (v: T) => void; label?: string; style?: StyleProp<ViewStyle>; onHero?: boolean }) {
  const { theme } = useStore();
  return (
    <View accessibilityLabel={label} style={[{ flexDirection: 'row', backgroundColor: onHero ? 'rgba(255,255,255,.12)' : theme.surface2, borderRadius: 12, padding: 3, gap: 2 }, style]}>
      {options.map(([k, text]) => {
        const on = k === value;
        const bg = onHero ? (on ? theme.lime : 'transparent') : on ? theme.surface : 'transparent';
        const fg = onHero ? (on ? '#0C3B31' : theme.heroInk) : on ? theme.ink : theme.muted;
        return (
          <Press key={String(k)} onPress={() => onChange(k)} selected={on} style={[{ flexGrow: 1, height: onHero ? 34 : 32, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }, on && !onHero && !theme.dark && { shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 }]}>
            <Txt size={13} w={on ? 700 : 600} color={fg} lines={1}>{text}</Txt>
          </Press>
        );
      })}
    </View>
  );
}

export function FilterChip({ label, on, onPress, dot }: { label: string; on: boolean; onPress: () => void; dot?: string }) {
  const { theme } = useStore();
  return (
    <Press onPress={onPress} selected={on} style={{ height: 36, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: on ? theme.ink : theme.line, backgroundColor: on ? theme.ink : theme.surface, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} /> : null}
      <Txt size={13} w={600} color={on ? theme.bg : theme.ink}>{label}</Txt>
    </Press>
  );
}

export function StatusChip({ kind, text, onHero }: { kind: 'ok' | 'near' | 'over'; text: string; onHero?: boolean }) {
  const { theme } = useStore();
  const col = kind === 'over' ? (onHero ? '#FDBA74' : theme.up) : kind === 'near' ? (onHero ? '#FCD34D' : theme.warn) : onHero ? theme.lime : theme.down;
  return (
    <View style={{ backgroundColor: onHero ? 'rgba(255,255,255,.1)' : theme.surface2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
      <Txt size={12} w={700} color={col} lines={1}>{text}</Txt>
    </View>
  );
}

export const kindColor = (k: 'ok' | 'near' | 'over', theme: { up: string; warn: string; brand: string }) => (k === 'over' ? theme.up : k === 'near' ? theme.warn : theme.brand);

/* ---------- progress bars ---------- */
// Fills toward `pct` (0..1) with the prototype's ease-out; starts from empty on mount.
export function Bar({ pct, color, height = 6, track, delay = 0, style }: { pct: number; color: string; height?: number; track?: string; delay?: number; style?: StyleProp<ViewStyle> }) {
  const { theme } = useStore();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: Math.max(0, Math.min(1, pct)), duration: 700, delay, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: false }).start();
  }, [pct, delay, v]);
  const width = v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={[{ height, borderRadius: 99, backgroundColor: track ?? theme.surface2, overflow: 'hidden', width: '100%' }, style]}>
      <Animated.View style={{ height: '100%', width, borderRadius: 99, backgroundColor: color }} />
    </View>
  );
}

export function Skeleton({ height, radius = 20 }: { height: number; radius?: number }) {
  const { theme } = useStore();
  const v = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.5, duration: 600, useNativeDriver: true })
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={{ height, borderRadius: radius, backgroundColor: theme.line, opacity: v }} />;
}

export const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
