import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Press, Txt } from '../components/ui';
import { useStore } from '../lib/store';

// Where the payment gateway sends the customer back to. The query string (result, purchase, paymentId) is only a
// hint from the browser, never proof of payment: the payment must be confirmed with the gateway from the server.
export default function PaymentResult() {
  const { t, theme } = useStore();
  const insets = useSafeAreaInsets();
  const { result } = useLocalSearchParams<{ result?: string; purchase?: string; paymentId?: string }>();
  const ok = result === 'success';
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 28, paddingTop: insets.top + 28, gap: 14 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: ok ? theme.lime : theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={ok ? 'check' : 'x'} size={30} color={ok ? '#0B1F18' : theme.up} />
      </View>
      <Txt size={24} w={700} display ls={-0.5} align="center">{ok ? t.payBackOk : t.payBackFail}</Txt>
      <Txt size={15} color={theme.muted} lh={22} align="center" style={{ maxWidth: 320 }}>{ok ? t.payBackOkBody : t.payBackFailBody}</Txt>
      <Press onPress={() => router.replace('/')} style={{ marginTop: 10, height: 52, paddingHorizontal: 28, borderRadius: 16, backgroundColor: theme.brand, alignItems: 'center', justifyContent: 'center' }}>
        <Txt size={16} w={700} color={theme.brandInk}>{t.payBack}</Txt>
      </Press>
    </View>
  );
}
