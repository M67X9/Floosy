import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { invoiceUrl, type PickedImage } from '../lib/expenses';
import { useStore } from '../lib/store';
import { Icon, Press, Txt } from './ui';

// Link to a photo in the private "Invoices" bucket (a short-lived signed URL).
function useInvoiceUrl(path: string | null) {
  const [state, setState] = useState<{ url: string | null; error: boolean }>({ url: null, error: false });
  useEffect(() => {
    if (!path) { setState({ url: null, error: false }); return; }
    let live = true;
    setState({ url: null, error: false });
    invoiceUrl(path).then((url) => live && setState({ url, error: false })).catch(() => live && setState({ url: null, error: true }));
    return () => { live = false; };
  }, [path]);
  return state;
}

// Shows either a freshly picked local photo (`uri`) or a stored one (`path`).
export function InvoicePhoto({ path, uri, height = 180, onPress }: { path?: string | null; uri?: string; height?: number; onPress?: () => void }) {
  const { theme, t } = useStore();
  const remote = useInvoiceUrl(uri ? null : path ?? null);
  const src = uri ?? remote.url;
  return (
    <Pressable disabled={!onPress || !src} onPress={onPress} accessibilityRole="imagebutton" accessibilityLabel={t.invoiceTitle} style={{ height, borderRadius: 16, overflow: 'hidden', backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center' }}>
      {src ? <Image source={{ uri: src }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        : remote.error ? <Txt size={13} color={theme.muted} align="center" style={{ padding: 12 }}>{t.photoLoadErr}</Txt>
        : <ActivityIndicator color={theme.muted} />}
    </Pressable>
  );
}

// Full-screen view of a stored invoice.
export function InvoiceViewer({ path, onClose }: { path: string; onClose: () => void }) {
  const { t, rtl } = useStore();
  const insets = useSafeAreaInsets();
  const remote = useInvoiceUrl(path);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', direction: rtl ? 'rtl' : 'ltr' }}>
        {remote.url ? <Image source={{ uri: remote.url }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
          : remote.error ? <Txt size={14} color="#FFFFFF" align="center">{t.photoLoadErr}</Txt>
          : <ActivityIndicator color="#FFFFFF" />}
        <Press label={t.close} onPress={onClose} style={{ position: 'absolute', top: insets.top + 12, end: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={22} color="#FFFFFF" />
        </Press>
      </View>
    </Modal>
  );
}

// Opens the camera or the photo library. Photos are re-encoded as JPEG (quality 0.7) to keep uploads small.
export async function pickInvoice(source: 'camera' | 'library'): Promise<{ image?: PickedImage; denied?: boolean }> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { denied: true };
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets[0]) return {};
  const a = result.assets[0];
  return { image: { uri: a.uri, mimeType: a.mimeType } };
}
