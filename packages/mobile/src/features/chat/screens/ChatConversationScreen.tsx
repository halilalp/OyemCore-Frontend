import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, StatusBar, Platform, KeyboardAvoidingView, Alert, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { getBase64FromFileUri } from '../../../utils/fileUtils';
import { api, ChatMessage, slateTokens } from '@oyemcore/shared';
import { useThemeStore } from '../../../store/useThemeStore';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { chatSignalR } from '../chatSignalR';
import { NewGroupModal } from '../components/NewGroupModal';
import { UserAvatar } from '../../../components/UserAvatar';

// Kendi mesaj balonu — açık zemin (2. ekteki gibi), koyu metin.
const MY_BUBBLE = '#E8EEFB';
const READ_GREEN = '#16A34A';

// Backend (ASP.NET Core) camelCase serialize eder; hem camel hem Pascal alanları tolere ederek normalize et.
const normalizeMsgInfo = (d: any) => {
  const g = (...keys: string[]) => { for (const k of keys) if (d?.[k] != null) return d[k]; return undefined; };
  const list = g('receiverList', 'ReceiverList') || [];
  return {
    mesajMetni: g('mesajMetni', 'MesajMetni') || '',
    gonderenAd: g('gonderenAd', 'GonderenAd') || '',
    gonderimTarihi: g('gonderimTarihi', 'GonderimTarihi') || '',
    isGroup: !!g('isGroup', 'IsGroup'),
    receiverList: (list as any[]).map((r: any) => ({
      adSoyad: r.adSoyad ?? r.AdSoyad ?? '-',
      okundu: r.okundu ?? r.Okundu ?? false,
      okunmaTarihi: r.okunmaTarihi ?? r.OkunmaTarihi ?? '',
    })),
  };
};

// Gün ayracı etiketi (Bugün / Dün / tarih).
const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Bugün';
  if (d.toDateString() === y.toDateString()) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const PAGE = 30;
const timeOf = (m: ChatMessage) => m.saat || (m.gonderimTarihi ? new Date(m.gonderimTarihi).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '');

export const ChatConversationScreen: React.FC<any> = ({ route, navigation }) => {
  const { targetSicilNo, targetName, isGroup, olusturanSicilNo } = route.params || {};
  const { colors } = useThemeStore();
  const styles = createStyles(colors);
  const user = useAuthStore(s => s.user);
  const mySicil = (user?.sicilNo || '').trim();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [members, setMembers] = useState<string[]>([]);
  const [targetOnline, setTargetOnline] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [msgInfo, setMsgInfo] = useState<any | null>(null);
  const [actionMsg, setActionMsg] = useState<ChatMessage | null>(null);
  const listRef = useRef<FlatList>(null);

  const belongsHere = useCallback((m: ChatMessage): boolean => {
    const t = (targetSicilNo || '').trim();
    if (isGroup) return (m.aliciSicilNo || '').trim() === t;
    const g = (m.gonderenSicilNo || '').trim();
    const a = (m.aliciSicilNo || '').trim();
    return (g === mySicil && a === t) || (g === t && a === mySicil);
  }, [targetSicilNo, isGroup, mySicil]);

  const loadHistory = useCallback(async (skip: number, mode: 'replace' | 'prepend') => {
    try {
      const older = await api.getChatHistory(targetSicilNo, skip, PAGE);
      setHasMore(older.length >= PAGE);
      setMessages(prev => (mode === 'prepend' ? [...older, ...prev] : older));
    } catch (_) {
      if (mode === 'replace') setMessages([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [targetSicilNo]);

  useEffect(() => {
    setLoading(true);
    loadHistory(0, 'replace');
    api.markChatConversationRead(targetSicilNo).catch(() => {});
  }, [targetSicilNo, loadHistory]);

  // SignalR: bu konuşmaya ait gelen mesajları ekle.
  useEffect(() => {
    if (!user?.sicilNo) return;
    chatSignalR.connect(user.sicilNo);
    const off = chatSignalR.onMessage((m) => {
      if (!belongsHere(m)) return;
      setMessages(prev => (prev.some(x => x.id === m.id && m.id !== 0) ? prev : [...prev, m]));
      if ((m.gonderenSicilNo || '').trim() !== mySicil) api.markChatConversationRead(targetSicilNo).catch(() => {});
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    });
    // Çevrimiçi durumu (1:1) — SignalR userStatusChanged.
    const offStatus = isGroup ? () => {} : chatSignalR.onStatus((sicil, online) => {
      if (sicil.trim().toUpperCase() === (targetSicilNo || '').trim().toUpperCase()) setTargetOnline(online);
    });
    // İlk açılışta karşı tarafın online olup olmadığını sidebar verisinden al.
    if (!isGroup) {
      api.getChatUsers(false).then(list => {
        const u = list.find(x => (x.sicilNo || '').trim().toUpperCase() === (targetSicilNo || '').trim().toUpperCase());
        if (u) setTargetOnline(!!u.isOnline);
      }).catch(() => {});
    }
    return () => { off(); offStatus(); };
  }, [user?.sicilNo, belongsHere, targetSicilNo, mySicil, isGroup]);

  // Polling: webportal'a dokunmadan web→mobil anlıklığı için açık sohbette
  // son sayfayı periyodik çekip yeni (id'si olmayan) mesajları ekler.
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const latest = await api.getChatHistory(targetSicilNo, 0, PAGE);
        if (!latest || latest.length === 0) return;
        setMessages(prev => {
          const known = new Set(prev.filter(x => x.id).map(x => x.id));
          const yeni = latest.filter(m => m.id && !known.has(m.id));
          if (yeni.length === 0) return prev;
          // Gelenler arasında karşı taraftan olan varsa okundu işaretle.
          if (yeni.some(m => (m.gonderenSicilNo || '').trim() !== mySicil)) {
            api.markChatConversationRead(targetSicilNo).catch(() => {});
          }
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
          return [...prev, ...yeni];
        });
      } catch (_) {}
    }, 3500);
    return () => clearInterval(iv);
  }, [targetSicilNo, mySicil]);

  const onLoadMore = () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    loadHistory(messages.length, 'prepend');
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    const parentID = reply?.id || null;
    setReply(null);
    try {
      await api.sendChatMessage({ aliciSicilNo: targetSicilNo, mesajMetni: body, parentID });
      // Gönderen echo'yu SignalR'dan alır; alınmazsa yerel ekleme fallback.
      setTimeout(() => {
        setMessages(prev => prev.some(x => x.mesajMetni === body && (x.gonderenSicilNo || '').trim() === mySicil)
          ? prev
          : [...prev, { id: 0, gonderenSicilNo: mySicil, gonderenAdSoyad: user?.adSoyad || '', aliciSicilNo: targetSicilNo, mesajMetni: body, gonderimTarihi: new Date().toISOString(), okundu: false } as ChatMessage]);
        listRef.current?.scrollToEnd({ animated: true });
      }, 400);
    } catch (_) {
      Alert.alert('Hata', 'Mesaj gönderilemedi.');
      setText(body);
    } finally {
      setSending(false);
    }
  };

  // Ek gönderme: kamera veya dosya seç → yükle → mesaj olarak gönder.
  const sendFile = async (fileName: string, uri: string, mimeType: string, size: number, preBase64?: string) => {
    setUploading(true);
    try {
      const base64 = preBase64 || await getBase64FromFileUri(uri);
      const up = await api.uploadHelpdeskFile({ fileName, fileBase64: base64, module: 'CHAT' });
      if (!up?.success || !up?.filePath) { Alert.alert('Hata', 'Dosya yüklenemedi.'); return; }
      await api.sendChatMessage({
        aliciSicilNo: targetSicilNo, mesajMetni: '',
        dosyaAdi: fileName, dosyaYolu: up.filePath, dosyaTipi: mimeType, dosyaBoyutu: size,
      });
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e: any) {
      const detay = e?.response?.data?.message || e?.message || String(e);
      Alert.alert('Hata', 'Dosya gönderilemedi.\n' + detay);
    } finally {
      setUploading(false);
    }
  };

  const onAttach = () => {
    Alert.alert('Ek Gönder', 'Ne göndermek istersiniz?', [
      { text: 'Kamera', onPress: async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('İzin', 'Kamera izni gerekli.'); return; }
        const r = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
        if (!r.canceled && r.assets?.[0]) {
          const a = r.assets[0];
          sendFile(a.fileName || `foto_${Date.now()}.jpg`, a.uri, a.mimeType || 'image/jpeg', a.fileSize || 0, a.base64 ?? undefined);
        }
      } },
      { text: 'Dosya', onPress: async () => {
        const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
        if (!r.canceled && r.assets?.[0]) {
          const a = r.assets[0];
          sendFile(a.name, a.uri, a.mimeType || 'application/octet-stream', a.size || 0);
        }
      } },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const openManage = async () => {
    try {
      const d = await api.getChatGroupDetails(targetSicilNo);
      setMembers((d?.members || []).map((m: any) => m.sicilNo));
    } catch (_) { setMembers([]); }
    setManageOpen(true);
  };

  const leaveGroup = () => {
    Alert.alert('Gruptan Ayrıl', 'Bu gruptan ayrılmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Ayrıl', style: 'destructive', onPress: async () => {
        try { await api.leaveChatGroup(targetSicilNo); navigation.goBack(); } catch (_) { Alert.alert('Hata', 'İşlem başarısız.'); }
      } },
    ]);
  };

  // Mesaja basılı tut → aksiyon menüsü (Yanıtla / Bilgi)
  const openActions = (item: ChatMessage) => {
    setActionMsg(item);
  };

  // Mesaj bilgisi: kim ne zaman okumuş (grup ise tüm üyeler). referans: GetMessageDetails
  const openMsgInfo = async (item: ChatMessage) => {
    setInfoLoading(true);
    setInfoOpen(true);
    setMsgInfo(null);
    try {
      const d = await api.getChatMessageDetails(item.id);
      // ASP.NET Core camelCase serialize eder; hem camel hem Pascal'ı tolere et
      const raw = d?.data ?? d?.Data ?? null;
      setMsgInfo(raw ? normalizeMsgInfo(raw) : null);
    } catch (_) {
      setMsgInfo(null);
    } finally {
      setInfoLoading(false);
    }
  };

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const sender = (item.gonderenSicilNo || '').trim();
    // Gün ayracı: önceki mesajdan farklı güne geçildiyse göster.
    const prev = index > 0 ? messages[index - 1] : null;
    const showDay = !prev || dayLabel(prev.gonderimTarihi) !== dayLabel(item.gonderimTarihi);
    const daySep = showDay ? (
      <View style={styles.daySepWrap}><Text style={styles.daySepText}>{dayLabel(item.gonderimTarihi)}</Text></View>
    ) : null;

    if (sender === 'SYSTEM') {
      return <>{daySep}<View style={styles.systemWrap}><Text style={styles.systemText}>{item.mesajMetni}</Text></View></>;
    }
    const mine = sender === mySicil;
    return (
      <>
      {daySep}
      <View style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowOther]}>
        <TouchableOpacity
          activeOpacity={0.85}
          delayLongPress={230}
          onLongPress={() => openActions(item)}
          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
        >
          {isGroup && !mine && <Text style={styles.senderName}>{item.gonderenAdSoyad}</Text>}
          {!!item.parentMesajMetni && (
            <View style={[styles.replyPreview, styles.replyPreviewOther]}>
              <Text style={styles.replyName} numberOfLines={1}>{item.parentGonderenAd || 'Yanıt'}</Text>
              <Text style={styles.replyText} numberOfLines={1}>{item.parentMesajMetni}</Text>
            </View>
          )}
          {!!item.dosyaAdi && (
            <View style={styles.fileBox}>
              <Ionicons name="document-outline" size={18} color={colors.primary} />
              <Text style={styles.fileName} numberOfLines={1}>{item.dosyaAdi}</Text>
            </View>
          )}
          {!!item.mesajMetni && <Text style={styles.msgText}>{item.mesajMetni}</Text>}
          <View style={styles.msgMeta}>
            <Text style={styles.msgTime}>{timeOf(item)}</Text>
            {mine && <Ionicons name={item.okundu ? 'checkmark-done' : 'checkmark'} size={14} color={item.okundu ? colors.primary : colors.textMuted} style={{ marginLeft: 4 }} />}
          </View>
        </TouchableOpacity>
      </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[slateTokens.brandPrimaryDk, slateTokens.brandPrimary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, StatusBar.currentHeight || 12) + 8 }]}
      >
        <View style={styles.bgCircleLarge} pointerEvents="none" />
        <View style={styles.bgCircleSmall} pointerEvents="none" />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        {isGroup ? (
          <View style={[styles.hAvatar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
            <Ionicons name="people" size={18} color="#fff" />
          </View>
        ) : (
          <View style={styles.hAvatarWrap}>
            <UserAvatar sicilNo={targetSicilNo} name={targetName} size={36} style={{ borderWidth: 0 }} />
            <View style={[styles.hOnlineDot, { backgroundColor: targetOnline ? '#22C55E' : '#94A3B8' }]} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{targetName}</Text>
          {isGroup ? (
            <Text style={styles.headerSub} numberOfLines={1}>Grup sohbeti</Text>
          ) : (
            <Text style={styles.headerSub}>{targetOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</Text>
          )}
        </View>
        {isGroup && (
          <TouchableOpacity onPress={openManage} style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m, i) => `${m.id}-${i}`}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
            onEndReachedThreshold={0.1}
            onScroll={(e) => { if (e.nativeEvent.contentOffset.y < 40) onLoadMore(); }}
            scrollEventThrottle={200}
            ListHeaderComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} /> : null}
            onContentSizeChange={() => { if (!loadingMore) listRef.current?.scrollToEnd({ animated: false }); }}
          />
        )}

        {reply && (
          <View style={styles.replyBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.replyBarName}>{reply.gonderenAdSoyad}</Text>
              <Text style={styles.replyBarText} numberOfLines={1}>{reply.mesajMetni}</Text>
            </View>
            <TouchableOpacity onPress={() => setReply(null)}><Ionicons name="close" size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={onAttach} disabled={uploading}>
            {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="add" size={26} color={colors.primary} />}
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Mesaj yazın..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]} onPress={send} disabled={!text.trim() || sending}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {isGroup && (
        <NewGroupModal
          visible={manageOpen}
          onClose={() => setManageOpen(false)}
          editGroupCode={targetSicilNo}
          initialName={targetName}
          initialMembers={members}
          onCreated={() => setManageOpen(false)}
        />
      )}

      {/* Mesaja basılı tut → aksiyon menüsü (Yanıtla / Bilgi) */}
      <Modal visible={!!actionMsg} transparent animationType="fade" onRequestClose={() => setActionMsg(null)}>
        <TouchableOpacity style={styles.actionBackdrop} activeOpacity={1} onPress={() => setActionMsg(null)}>
          <View style={styles.actionSheet}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => { if (actionMsg) setReply(actionMsg); setActionMsg(null); }}
            >
              <Ionicons name="arrow-undo-outline" size={20} color={colors.text} />
              <Text style={styles.actionLabel}>Yanıtla</Text>
            </TouchableOpacity>
            {!!actionMsg && (actionMsg.gonderenSicilNo || '').trim() === mySicil && actionMsg.id > 0 && (
              <>
                <View style={styles.actionDivider} />
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => { const m = actionMsg; setActionMsg(null); if (m) openMsgInfo(m); }}
                >
                  <Ionicons name="information-circle-outline" size={20} color={colors.text} />
                  <Text style={styles.actionLabel}>Bilgi</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Mesaj bilgisi: kim ne zaman görmüş (webportal ile aynı düzen) */}
      <Modal visible={infoOpen} transparent animationType="fade" onRequestClose={() => setInfoOpen(false)}>
        <View style={styles.infoBackdrop}>
          <View style={styles.infoCard}>
            <View style={styles.infoHead}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.infoTitle}>Mesaj Bilgisi</Text>
              <TouchableOpacity onPress={() => setInfoOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {infoLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
            ) : !msgInfo ? (
              <Text style={styles.infoEmpty}>Bilgi alınamadı.</Text>
            ) : (
              <>
                <View style={styles.infoMetaBox}>
                  <Text style={styles.infoMetaLine}>
                    Gönderen: <Text style={styles.infoMetaStrong}>{msgInfo.gonderenAd || '-'}</Text>
                    {'  |  '}Tarih: <Text style={styles.infoMetaStrong}>{msgInfo.gonderimTarihi || '-'}</Text>
                  </Text>
                  {!!msgInfo.mesajMetni && <Text style={styles.infoMsgText} numberOfLines={4}>{msgInfo.mesajMetni}</Text>}
                </View>
                <Text style={styles.infoSectionTitle}>Okunma Durumu</Text>
                <ScrollView style={{ maxHeight: 300 }}>
                  {(msgInfo.receiverList || []).length === 0 ? (
                    <Text style={styles.infoEmpty}>Alıcı bilgisi yok.</Text>
                  ) : (
                    msgInfo.receiverList.map((r: any, i: number) => (
                      <View key={i} style={styles.infoRow}>
                        <Text style={styles.infoName}>{r.adSoyad || '-'}</Text>
                        <View style={styles.infoStateWrap}>
                          <Text style={[styles.infoState, { color: r.okundu ? READ_GREEN : colors.textMuted }]}>
                            {r.okundu ? `Okudu (${r.okunmaTarihi || ''})` : 'Görülmedi'}
                          </Text>
                          <Ionicons name={r.okundu ? 'checkmark-done' : 'checkmark'} size={15} color={r.okundu ? READ_GREEN : colors.textMuted} />
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 22, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' },
  bgCircleLarge: { position: 'absolute', width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(255,255,255,0.05)', top: -180, right: -110 },
  bgCircleSmall: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.04)', top: 10, left: -80 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  hAvatarWrap: { width: 36, height: 36, position: 'relative' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 11.5, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  msgRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: MY_BUBBLE, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  senderName: { fontSize: 12, fontWeight: '800', color: colors.primary, marginBottom: 2 },
  msgText: { fontSize: 14.5, color: colors.text, lineHeight: 20 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 },
  msgTime: { fontSize: 10.5, color: colors.textMuted },
  replyPreview: { borderLeftWidth: 3, paddingLeft: 8, paddingVertical: 4, paddingRight: 8, marginBottom: 5, borderRadius: 6 },
  replyPreviewMine: { backgroundColor: 'rgba(255,255,255,0.18)', borderLeftColor: '#fff' },
  replyPreviewOther: { backgroundColor: colors.background, borderLeftColor: colors.primary },
  replyName: { fontSize: 11, fontWeight: '700', color: colors.primary },
  replyText: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  hOnlineDot: { position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#4F46E5' },
  headerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  attachBtn: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  fileBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  fileName: { fontSize: 13, color: colors.text, flex: 1 },
  actionBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  actionSheet: { backgroundColor: colors.card, borderRadius: 16, minWidth: 200, paddingVertical: 4, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  actionLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  actionDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 12 },
  infoBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 22 },
  infoCard: { backgroundColor: colors.card, borderRadius: 18, padding: 16 },
  infoHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  infoTitle: { flex: 1, fontSize: 15.5, fontWeight: '800', color: colors.text },
  infoMetaBox: { backgroundColor: colors.background, borderRadius: 10, padding: 12, marginBottom: 14 },
  infoMetaLine: { fontSize: 12, color: colors.textSecondary },
  infoMetaStrong: { fontWeight: '700', color: colors.text },
  infoMsgText: { fontSize: 14.5, fontWeight: '600', color: colors.text, marginTop: 8 },
  infoSectionTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 4 },
  infoEmpty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginVertical: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoName: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  infoStateWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoState: { fontSize: 12.5, fontWeight: '600' },
  systemWrap: { alignItems: 'center', marginVertical: 8 },
  systemText: { fontSize: 11.5, color: colors.textSecondary, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
  daySepWrap: { alignItems: 'center', marginVertical: 10 },
  daySepText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },
  replyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  replyBarName: { fontSize: 12, fontWeight: '700', color: colors.primary },
  replyBarText: { fontSize: 12.5, color: colors.textSecondary },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 110, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 10 : 6, color: colors.text, fontSize: 14.5 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
