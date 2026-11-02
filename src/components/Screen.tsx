import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../lib/store';

export function Screen({ children, top = 22, gap = 16 }: { children: ReactNode; top?: number; gap?: number }) {
  const insets = useSafeAreaInsets();
  const { theme } = useStore();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ gap, paddingTop: insets.top + top, paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}
