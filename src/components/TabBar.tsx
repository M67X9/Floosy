import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconName } from '../lib/icons';
import { useStore } from '../lib/store';
import { Icon, Press, Txt } from './ui';
import { useUI } from './ui-state';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function TabBar({ state, navigateToTab }: TabBarProps) {
  const { t, theme } = useStore();
  const { openAdd } = useUI();
  const insets = useSafeAreaInsets();
  // The budget page lives under Home.
  const current = state.routes[state.index].name;
  const active = current === 'budget' ? 'index' : current;

  const item = (route: string, icon: IconName, label: string) => {
    const on = active === route;
    return (
      <Press label={label} selected={on} onPress={() => { const r = state.routes.find((x) => x.name === route); if (r) navigateToTab(r.key); }} style={{ flex: 1, height: 60, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <View style={{ width: 52, height: 30, borderRadius: 99, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? theme.surface2 : 'transparent' }}>
          <Icon name={icon} size={22} color={on ? theme.ink : theme.muted} />
        </View>
        <Txt size={11} w={on ? 700 : 500} color={on ? theme.ink : theme.muted} lines={1}>{label}</Txt>
      </Press>
    );
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingTop: 6, paddingHorizontal: 6, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.line }}>
      {item('index', 'home', t.home)}
      {item('history', 'list', t.txShort)}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Press label={t.addTitle} onPress={openAdd} style={{ width: 62, height: 62, borderRadius: 22, marginTop: -24, backgroundColor: theme.brand, borderWidth: 4, borderColor: theme.bg, alignItems: 'center', justifyContent: 'center', shadowColor: '#0B5D4B', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
          <Icon name="plus" size={28} color={theme.brandInk} />
        </Press>
      </View>
      {item('insights', 'chart', t.insTitle)}
      {item('settings', 'settings', t.setTitle)}
    </View>
  );
}
