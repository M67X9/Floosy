import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendly } from '../lib/dates';
import { CATS, SUGG, type CatId } from '../lib/i18n';
import { readInvoice, uploadInvoice, type PickedImage } from '../lib/expenses';
import { curOf, f3, moneyOf } from '../lib/money';
import { normalizeNumber } from '../lib/num';
import { catOf } from '../lib/selectors';
import { useStore } from '../lib/store';
import { soft } from '../lib/theme';
import type { Tx } from '../lib/types';
import { Calendar } from './Calendar';
import { InvoicePhoto, InvoiceViewer, pickInvoice } from './Invoice';
import { CatBadge } from './parts';
import { Chev, Icon, Press, Seg, Txt } from './ui';
import { useUI } from './ui-state';

/* ---------- toast ---------- */
function Toast() {
  const { toast } = useUI();
  const { theme } = useStore();
  const insets = useSafeAreaInsets();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!toast) return;
    v.setValue(0);
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(1480),
      Animated.timing(v, { toValue: 0, duration: 280, useNativeDriver: true })
    ]).start();
  }, [toast, v]);
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 8, start: 0, end: 0, alignItems: 'center', zIndex: 60 }}>
      <Animated.View accessibilityRole="alert" style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }], flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingStart: 10, paddingEnd: 16, borderRadius: 99, backgroundColor: theme.ink, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: theme.lime, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={16} color="#0B1F18" />
        </View>
        <Txt size={14} w={600} color={theme.bg}>{toast.msg}</Txt>
      </Animated.View>
    </View>
  );
}

/* ---------- sheet frame ---------- */
function SheetFrame({ children, label }: { children: React.ReactNode; label: string }) {
  const { theme, rtl } = useStore();
  const { closeSheet } = useUI();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="slide" onRequestClose={closeSheet} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', direction: rtl ? 'rtl' : 'ltr' }}>
        <Pressable accessibilityLabel={label} onPress={closeSheet} style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: theme.overlay }} />
        <View accessibilityViewIsModal style={{ maxHeight: '92%', backgroundColor: theme.surface, borderTopStartRadius: 30, borderTopEndRadius: 30, paddingTop: 10, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 12 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: theme.line, marginBottom: 16 }} />
          <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CloseBtn() {
  const { theme, t } = useStore();
  const { closeSheet } = useUI();
  return (
    <Press label={t.close} onPress={closeSheet} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="x" size={20} />
    </Press>
  );
}

/* ---------- add / edit ---------- */
function PhotoBtn({ icon, label, onPress, danger }: { icon: 'camera' | 'image' | 'trash'; label: string; onPress: () => void; danger?: boolean }) {
  const { theme } = useStore();
  const color = danger ? theme.up : theme.ink;
  return (
    <Press onPress={onPress} label={label} style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 }}>
      <Icon name={icon} size={17} color={color} />
      <Txt size={13} w={600} color={color} lines={1}>{label}</Txt>
    </Press>
  );
}

function ExpenseSheet({ editing }: { editing: Tx | null }) {
  const { lang, t, theme, today, addTx, updateTx } = useStore();
  const { closeSheet, showToast, flash } = useUI();
  const money = moneyOf(lang), cur = curOf(lang);
  const initialDesc = editing ? (editing[lang] || editing.en || '') : '';
  const [amount, setAmount] = useState(editing ? editing.amount.toFixed(3) : '');
  const [desc, setDesc] = useState(initialDesc);
  const [cat, setCat] = useState<CatId>(editing?.cat ?? 'food');
  const [date, setDate] = useState(editing?.date ?? today);
  const [showCal, setShowCal] = useState(false);
  const [err, setErr] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<'db' | 'photo' | null>(null);
  const [photo, setPhoto] = useState<{ kind: 'existing'; path: string } | { kind: 'new'; img: PickedImage } | null>(editing?.image ? { kind: 'existing', path: editing.image } : null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [readMsg, setReadMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const amountRef = useRef<ComponentRef<typeof TextInput>>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { const id = setTimeout(() => amountRef.current?.focus(), 350); return () => clearTimeout(id); }, []);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const n = parseFloat(amount) || 0;
  const valid = n > 0;

  const doShake = () => {
    shake.setValue(0);
    Animated.sequence([-8, 7, -5, 3, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 80, useNativeDriver: true }))).start();
  };

  // Fills only the fields the model could read; the user still reviews everything before saving.
  const runAutofill = async (img: PickedImage) => {
    setReading(true); setReadMsg(null);
    try {
      const d = await readInvoice(img);
      const found = d.amount != null || d.date != null || d.category != null || d.description != null;
      if (d.amount != null) { setAmount(d.amount.toFixed(3)); setErr(false); }
      if (d.date != null) setDate(d.date);
      if (d.category != null) setCat(d.category);
      if (d.description != null) setDesc(d.description);
      setReadMsg(found ? { text: t.autofillDone, ok: true } : { text: t.autofillNone, ok: false });
    } catch { setReadMsg({ text: t.autofillErr, ok: false }); }
    setReading(false);
  };

  // `thenRead`: the photo was picked through the Autofill button, so read it straight away.
  const pick = async (source: 'camera' | 'library', thenRead = false) => {
    setPhotoMsg(null); setReadMsg(null);
    try {
      const r = await pickInvoice(source);
      if (r.denied) setPhotoMsg(t.cameraDenied);
      else if (r.image) {
        setPhoto({ kind: 'new', img: r.image });
        if (thenRead) await runAutofill(r.image);
      }
    } catch { setPhotoMsg(t.invoiceErr); }
  };

  // With a photo already picked it reads that photo; otherwise it opens the photo picker first.
  const autofill = () => {
    if (reading) return;
    if (photo?.kind === 'new') { runAutofill(photo.img); return; }
    if (Platform.OS === 'web') { pick('library', true); return; }
    Alert.alert(t.autofill, undefined, [
      { text: t.takePhoto, onPress: () => { pick('camera', true); } },
      { text: t.choosePhoto, onPress: () => { pick('library', true); } },
      { text: t.cancel, style: 'cancel' }
    ]);
  };

  const save = async () => {
    if (!valid) { setErr(true); doShake(); amountRef.current?.focus(); return; }
    if (saving) return;
    const value = Math.round(n * 1000) / 1000;
    setSaving(true); setFailed(null);

    // undefined = leave the invoice as it is; null = remove it; string = path of a newly uploaded photo.
    let image: string | null | undefined;
    if (photo?.kind === 'new') {
      try { image = await uploadInvoice(photo.img); } catch { setSaving(false); setFailed('photo'); return; }
    } else if (!photo && editing?.image) image = null;

    if (editing) {
      const ok = await updateTx(editing.id, { amount: value, cat, date, description: desc !== initialDesc ? desc.trim() : undefined, image });
      setSaving(false);
      if (!ok) { setFailed('db'); return; }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      flash(editing.id);
      closeSheet();
      showToast(t.toastSaved);
    } else {
      const tx = await addTx({ amount: value, cat, date, description: desc.trim(), image: image ?? null });
      setSaving(false);
      if (!tx) { setFailed('db'); return; }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      flash(tx.id);
      setSaved(value);
      closeTimer.current = setTimeout(closeSheet, 900);
    }
  };

  if (saved != null) {
    return (
      <SheetFrame label={t.close}>
        <View accessibilityRole="alert" style={{ alignItems: 'center', gap: 12, paddingTop: 40, paddingBottom: 56 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: theme.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 10, borderColor: theme.flash }}>
            <Icon name="check" size={42} color="#0B1F18" />
          </View>
          <Txt size={22} w={700} display>{t.toastAdded}</Txt>
          <Txt size={16} color={theme.muted} num ltr>{money(saved)}</Txt>
        </View>
      </SheetFrame>
    );
  }

  const sc = catOf(cat);
  const inputW = Math.min(280, Math.max(5, amount.length) * 30 + 14);
  return (
    <SheetFrame label={t.close}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={21} w={700} display ls={-0.4}>{editing ? t.editTitle : t.addTitle}</Txt>
        <CloseBtn />
      </View>

      <Animated.View style={{ alignItems: 'center', gap: 4, paddingTop: 6, paddingBottom: 2, transform: [{ translateX: shake }] }}>
        <Txt size={13} w={600} color={theme.muted}>{t.amount}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 8, direction: 'ltr' }}>
          <TextInput
            ref={amountRef} value={amount} placeholder="0.000" placeholderTextColor={theme.muted} keyboardType="decimal-pad" inputMode="decimal"
            accessibilityLabel={t.amount} accessibilityHint={err ? t.amountErr : undefined} autoComplete="off"
            onChangeText={(raw) => { const v = normalizeNumber(raw); if (/^\d{0,6}(\.\d{0,3})?$/.test(v)) { setAmount(v); setErr(false); } }}
            style={{ width: inputW, padding: 0, textAlign: 'center', fontFamily: 'BricolageGrotesque_700Bold', fontSize: 50, letterSpacing: -1.5, color: theme.ink, fontVariant: ['tabular-nums'] }}
          />
          <Txt size={22} w={700} display color={theme.muted}>{cur}</Txt>
        </View>
        {err ? <Txt size={13} w={600} color={theme.up}>{t.amountErr}</Txt> : null}
      </Animated.View>

      <View style={{ gap: 8 }}>
        <Txt size={13} w={600} color={theme.muted}>{t.desc}</Txt>
        <TextInput
          value={desc} onChangeText={setDesc} placeholder={t.descPh} placeholderTextColor={theme.muted} autoComplete="off" accessibilityLabel={t.desc}
          style={{ height: 50, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, paddingHorizontal: 14, fontFamily: 'IBMPlexSansArabic_400Regular', fontSize: 16, color: theme.ink, textAlign: lang === 'ar' ? 'right' : 'left' }}
        />
        {!desc && !editing ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }}>
            {SUGG.map((s) => (
              <Press key={s.en} onPress={() => { setDesc(s[lang]); setCat(s.cat); }} style={{ height: 34, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, justifyContent: 'center' }}>
                <Txt size={13} w={500}>{s[lang]}</Txt>
              </Press>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={{ gap: 8 }}>
        <Txt size={13} w={600} color={theme.muted}>{t.date}</Txt>
        <Press onPress={() => setShowCal(!showCal)} style={{ height: 50, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 }}>
          <Icon name="calendar" size={18} />
          <View style={{ flex: 1 }}><Txt size={15} w={600} lines={1}>{friendly(lang, date, today)}</Txt></View>
          <View style={{ transform: [{ rotate: showCal ? '180deg' : '0deg' }] }}><Chev dir="D" size={18} color={theme.muted} /></View>
        </Press>
        {showCal ? <Calendar value={date} onPick={(iso) => { setDate(iso); setShowCal(false); }} /> : null}
      </View>

      <View style={{ gap: 8 }}>
        <Txt size={13} w={600} color={theme.muted}>{t.category + ' · '}<Txt size={13} w={600}>{sc[lang]}</Txt></Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATS.map((c) => {
            const on = cat === c.id;
            return (
              <Press key={c.id} role="radio" selected={on} label={c[lang]} onPress={() => setCat(c.id)} style={{ width: '17.8%', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 2, minHeight: 68, borderRadius: 16, backgroundColor: on ? soft(c.color, theme.dark) : 'transparent', borderWidth: 1.5, borderColor: on ? c.color : 'transparent' }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.color : soft(c.color, theme.dark) }}>
                  <Icon name={c.id} size={20} color={on ? '#FFFFFF' : c.color} />
                </View>
                <Txt size={11} w={on ? 700 : 500} lh={13} lines={1} align="center">{lang === 'ar' ? c.sAr : c.sEn}</Txt>
              </Press>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Txt size={13} w={600} color={theme.muted}>{t.invoice}</Txt>
        {photo ? <InvoicePhoto height={180} uri={photo.kind === 'new' ? photo.img.uri : undefined} path={photo.kind === 'existing' ? photo.path : undefined} /> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {Platform.OS !== 'web' ? <PhotoBtn icon="camera" label={t.takePhoto} onPress={() => pick('camera')} /> : null}
          <PhotoBtn icon="image" label={photo ? t.changePhoto : t.choosePhoto} onPress={() => pick('library')} />
          {photo ? <PhotoBtn icon="trash" label={t.removePhoto} danger onPress={() => { setPhoto(null); setPhotoMsg(null); setReadMsg(null); }} /> : null}
        </View>
        <Press onPress={autofill} disabled={reading} label={t.autofill} style={{ minHeight: 48, borderRadius: 14, backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 }}>
          {reading ? <ActivityIndicator color={theme.ink} size="small" /> : <Icon name="spark" size={18} color={theme.ink} />}
          <Txt size={14} w={700}>{reading ? t.autofilling : t.autofill}</Txt>
        </Press>
        {readMsg ? <Txt size={13} w={600} color={readMsg.ok ? theme.muted : theme.up}>{readMsg.text}</Txt> : null}
        {photoMsg ? <Txt size={13} w={600} color={theme.up}>{photoMsg}</Txt> : null}
      </View>

      {failed ? <Txt size={13} w={600} color={theme.up} align="center">{failed === 'photo' ? t.invoiceErr : t.toastError}</Txt> : null}
      <Press onPress={save} disabled={!valid || saving} style={{ height: 56, borderRadius: 18, marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: valid ? theme.brand : theme.surface2 }}>
        <Icon name="check" size={20} color={valid ? theme.brandInk : theme.muted} />
        <Txt size={16} w={700} color={valid ? theme.brandInk : theme.muted}>{saving ? '…' : editing ? t.saveChanges : t.save}</Txt>
      </Press>
    </SheetFrame>
  );
}

/* ---------- detail ---------- */
function DetailSheet({ id }: { id: string }) {
  const { lang, t, theme, today, txs, deleteTx } = useStore();
  const { closeSheet, openEdit, showToast } = useUI();
  const [confirm, setConfirm] = useState(false);
  const [failed, setFailed] = useState(false);
  const [viewing, setViewing] = useState(false);
  const x = txs.find((y) => y.id === id);
  if (!x) return null;
  const c = catOf(x.cat);
  const detailRow = (label: string, node: React.ReactNode, last?: boolean) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.line }}>
      <Txt size={14} color={theme.muted}>{label}</Txt>{node}
    </View>
  );
  const btn = { height: 52, borderRadius: 16, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1 } as const;

  return (
    <SheetFrame label={t.close}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={14} w={600} color={theme.muted}>{t.details}</Txt>
        <CloseBtn />
      </View>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <CatBadge cat={x.cat} size={64} icon={28} radius={22} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Txt size={38} w={700} num ltr>{f3(x.amount)}</Txt>
          <Txt size={16} w={700} color={theme.muted}>{curOf(lang)}</Txt>
        </View>
        <Txt size={17} w={600} align="center">{(lang === 'ar' ? x.ar : x.en) || t.noDesc}</Txt>
      </View>
      <View style={{ borderRadius: 18, backgroundColor: theme.surface2, paddingHorizontal: 16 }}>
        {detailRow(t.category, <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.color }} /><Txt size={14} w={600}>{c[lang]}</Txt></View>)}
        {detailRow(t.date, <Txt size={14} w={600} lines={2} style={{ flexShrink: 1, textAlign: 'right' }}>{friendly(lang, x.date, today)}</Txt>, true)}
      </View>
      {x.image ? (
        <View style={{ gap: 8 }}>
          <Txt size={13} w={600} color={theme.muted}>{t.invoiceTitle}</Txt>
          <InvoicePhoto path={x.image} height={200} onPress={() => setViewing(true)} />
          {viewing ? <InvoiceViewer path={x.image} onClose={() => setViewing(false)} /> : null}
        </View>
      ) : null}
      {!confirm ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Press onPress={() => openEdit(x)} style={btn}><Icon name="pencil" size={18} /><Txt size={15} w={700}>{t.edit}</Txt></Press>
          <Press onPress={() => setConfirm(true)} style={btn}><Icon name="trash" size={18} color={theme.up} /><Txt size={15} w={700} color={theme.up}>{t.delete}</Txt></Press>
        </View>
      ) : (
        <View accessibilityRole="alert" style={{ borderRadius: 18, borderWidth: 1, borderColor: theme.line, padding: 16, gap: 12 }}>
          <Txt size={16} w={700}>{t.confirmDel}</Txt>
          <Txt size={14} color={theme.muted}>{t.confirmBody}</Txt>
          {failed ? <Txt size={13} w={600} color={theme.up}>{t.toastError}</Txt> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Press onPress={() => setConfirm(false)} style={{ ...btn, height: 48, borderRadius: 14 }}><Txt size={15} w={700}>{t.cancel}</Txt></Press>
            <Press onPress={async () => { const ok = await deleteTx(x.id); if (!ok) { setFailed(true); return; } closeSheet(); showToast(t.toastDeleted); }} style={{ ...btn, height: 48, borderRadius: 14, borderWidth: 0, backgroundColor: theme.danger }}><Txt size={15} w={700} color="#FFFFFF">{t.delete}</Txt></Press>
          </View>
        </View>
      )}
    </SheetFrame>
  );
}

/* ---------- first run / edit name & income ---------- */
export function Onboarding() {
  const { lang, t, theme, profile, setLang, saveProfile, rtl } = useStore();
  const { editingProfile, closeProfile } = useUI();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(profile?.name ?? '');
  const [income, setIncome] = useState(profile ? profile.income.toFixed(3) : '');
  const [nameErr, setNameErr] = useState(false);
  const [incomeErr, setIncomeErr] = useState(false);

  const submit = () => {
    const nm = name.trim(), inc = parseFloat(income) || 0;
    setNameErr(!nm); setIncomeErr(!(inc > 0));
    if (!nm || !(inc > 0)) return;
    saveProfile({ name: nm, income: Math.round(inc * 1000) / 1000 });
    closeProfile();
  };

  const field = { height: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.surface2, paddingHorizontal: 14, color: theme.ink } as const;
  return (
    <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: theme.hero, zIndex: 50, direction: rtl ? 'rtl' : 'ltr' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: -60, end: -90, width: 320, height: 320, opacity: 0.18 }}>
        {[30, 48, 66, 84, 99].map((r) => <View key={r} style={{ position: 'absolute', width: r * 3.2, height: r * 3.2, borderRadius: r * 1.6, borderWidth: 1, borderColor: theme.lime, top: 160 - r * 1.6, start: 160 - r * 1.6 }} />)}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingTop: insets.top + 18, paddingHorizontal: 20, alignItems: 'flex-end' }}>
            <Seg onHero style={{ width: 170 }} label={t.language} value={lang} onChange={setLang} options={[['en', 'English'], ['ar', 'العربية']]} />
          </View>
          <View style={{ gap: 14, paddingTop: 48, paddingHorizontal: 28, paddingBottom: 32 }}>
            <View style={{ width: 60, height: 60, borderRadius: 19, backgroundColor: theme.lime, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={38} w={800} display color="#0C3B31" style={{ marginTop: -5 }}>f</Txt>
            </View>
            <Txt size={38} w={800} display ls={-1.3} lh={40} style={{ marginTop: 8 }} color={theme.heroInk}>{profile ? t.editProfile : t.obTitle}</Txt>
            <Txt size={16} color={theme.heroMuted} lh={24} style={{ maxWidth: 300 }}>{t.obBody}</Txt>
          </View>
          <View style={{ marginTop: 'auto', backgroundColor: theme.surface, borderTopStartRadius: 30, borderTopEndRadius: 30, paddingTop: 26, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) + 16, gap: 18 }}>
            <View style={{ gap: 8 }}>
              <Txt size={13} w={600} color={theme.muted}>{t.obName}</Txt>
              <TextInput value={name} onChangeText={(v) => { setName(v); setNameErr(false); }} placeholder={t.obNamePh} placeholderTextColor={theme.muted} autoComplete="given-name" autoFocus={!profile} returnKeyType="next"
                style={[field, { fontFamily: 'IBMPlexSansArabic_600SemiBold', fontSize: 17, textAlign: rtl ? 'right' : 'left' }]} />
              {nameErr ? <Txt size={13} w={600} color={theme.up}>{t.obNameErr}</Txt> : null}
            </View>
            <View style={{ gap: 8 }}>
              <Txt size={13} w={600} color={theme.muted}>{t.obIncome}</Txt>
              <View style={{ direction: 'ltr', justifyContent: 'center' }}>
                <TextInput value={income} onChangeText={(raw) => { const v = normalizeNumber(raw); if (/^\d{0,7}(\.\d{0,3})?$/.test(v)) { setIncome(v); setIncomeErr(false); } }} placeholder="0.000" placeholderTextColor={theme.muted} keyboardType="decimal-pad" inputMode="decimal" onSubmitEditing={submit}
                  style={[field, { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 20, paddingEnd: 60, fontVariant: ['tabular-nums'] }]} />
                <View pointerEvents="none" style={{ position: 'absolute', right: 16 }}><Txt size={15} w={700} color={theme.muted}>{curOf(lang)}</Txt></View>
              </View>
              <Txt size={12.5} color={theme.muted} lh={17}>{t.obIncomeHelp}</Txt>
              {incomeErr ? <Txt size={13} w={600} color={theme.up}>{t.obIncomeErr}</Txt> : null}
            </View>
            <Press onPress={submit} style={{ height: 56, borderRadius: 18, backgroundColor: theme.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Txt size={16} w={700} color={theme.brandInk}>{profile ? t.saveChanges : t.obStart}</Txt>
              <Chev dir="R" size={20} color={theme.brandInk} />
            </Press>
            {profile ? (
              <Press onPress={closeProfile} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}><Txt size={15} w={600} color={theme.muted}>{t.cancel}</Txt></Press>
            ) : (
              <Txt size={12} color={theme.muted} align="center" lh={17}>{t.obNote}</Txt>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function Overlays() {
  const { sheet } = useUI();
  return (
    <>
      {sheet?.kind === 'add' ? <ExpenseSheet key={sheet.editing?.id ?? 'new'} editing={sheet.editing} /> : null}
      {sheet?.kind === 'detail' ? <DetailSheet key={sheet.id} id={sheet.id} /> : null}
      <Toast />
    </>
  );
}
