import { Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="settings" />
      {/* Reachable from Home and Settings; the custom tab bar only draws the four main tabs. */}
      <Tabs.Screen name="budget" />
    </Tabs>
  );
}
