import { BricolageGrotesque_500Medium, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthScreen } from '../components/Auth';
import { Onboarding, Overlays } from '../components/overlays';
import { UIProvider, useUI } from '../components/ui-state';
import { AuthProvider, useAuth } from '../lib/auth';
import { StoreProvider, useStore } from '../lib/store';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { ready, theme, rtl, profile } = useStore();
  const { editingProfile } = useUI();
  const { user } = useAuth();
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;
  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.hero }}>
        <StatusBar style="light" />
        <AuthScreen />
      </View>
    );
  }
  const onboarding = !profile || editingProfile;
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, direction: rtl ? 'rtl' : 'ltr' }}>
      <StatusBar style={onboarding || theme.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg }, animation: 'fade' }} />
      <Overlays />
      {onboarding ? <Onboarding key={profile ? 'edit' : 'first'} /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_500Medium, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_600SemiBold, IBMPlexSansArabic_700Bold
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StoreProvider>
          <UIProvider>
            <Shell />
          </UIProvider>
        </StoreProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
