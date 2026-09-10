import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, PermissionsAndroid, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createCallObject, DailyMediaView, isCallAvailable } from './dailyClient';

interface Props {
  roomUrl: string;
  peerName: string;
  callType: string;            // 'video' | 'audio'
  // Kullanıcı ekranda kapat'a bastığında: karşı tarafa EndCall sinyali gönder + state temizle.
  onHangup: () => void;
}

// Android'de arama öncesi kamera + mikrofon runtime izinlerini iste.
async function ensureAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    return (
      res[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
      res[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (_) {
    return false;
  }
}

// Daily katılımcısından video/ses track'lerini normalize eder.
const pickTracks = (p: any) => ({
  video: p?.tracks?.video?.state === 'playable' ? p.tracks.video.persistentTrack : null,
  audio: p?.tracks?.audio?.state === 'playable' ? p.tracks.audio.persistentTrack : null,
});

export const ActiveCallScreen: React.FC<Props> = ({ roomUrl, peerName, callType, onHangup }) => {
  const insets = useSafeAreaInsets();
  const callRef = useRef<any>(null);
  const [status, setStatus] = useState<'connecting' | 'joined' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [local, setLocal] = useState<any>(null);
  const [remote, setRemote] = useState<any>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callType !== 'audio');
  const [elapsed, setElapsed] = useState(0);

  const refreshParticipants = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    try {
      const parts = call.participants();
      const localP = parts?.local || null;
      const remoteP = Object.values(parts || {}).find((p: any) => p && !p.local) || null;
      setLocal(localP);
      setRemote(remoteP);
    } catch (_) {}
  }, []);

  useEffect(() => {
    let mounted = true;
    let call: any = null;

    (async () => {
      if (!isCallAvailable()) {
        setStatus('error');
        setErrorMsg('Görüntülü görüşme bu yapıda kullanılamıyor. Geliştirici derlemesi (dev build) gerekli.');
        return;
      }
      const ok = await ensureAndroidPermissions();
      if (!ok) {
        setStatus('error');
        setErrorMsg('Kamera ve mikrofon izni verilmedi.');
        return;
      }
      call = createCallObject();
      if (!call) {
        setStatus('error');
        setErrorMsg('Arama başlatılamadı.');
        return;
      }
      callRef.current = call;

      call.on('joined-meeting', () => { if (mounted) { setStatus('joined'); refreshParticipants(); } });
      call.on('participant-joined', refreshParticipants);
      call.on('participant-updated', refreshParticipants);
      call.on('participant-left', refreshParticipants);
      call.on('error', (e: any) => { if (mounted) { setStatus('error'); setErrorMsg(e?.errorMsg || 'Bağlantı hatası.'); } });

      try {
        await call.join({ url: roomUrl });
        if (callType === 'audio') { try { await call.setLocalVideo(false); } catch (_) {} }
      } catch (e: any) {
        if (mounted) { setStatus('error'); setErrorMsg(e?.message || 'Odaya katılınamadı.'); }
      }
    })();

    return () => {
      mounted = false;
      const c = callRef.current;
      if (c) {
        try { c.leave(); } catch (_) {}
        try { c.destroy(); } catch (_) {}
      }
      callRef.current = null;
    };
  }, [roomUrl, callType, refreshParticipants]);

  // Süre sayacı (bağlandıktan sonra).
  useEffect(() => {
    if (status !== 'joined') return;
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, [status]);

  // Teşhis: uzak katılımcının video track durumunu logla. Android↔iOS video render sorununda
  // (kamera açıkken görünmüyor) nedenini ayırt eder: state 'loading' mı, persistentTrack null mı,
  // subscribed false mu, yoksa codec/decode mı. Cihaz logunda "[CALL][remote-video]" ile aranır.
  useEffect(() => {
    const v = remote?.tracks?.video;
    if (remote) {
      console.log('[CALL][remote-video]', JSON.stringify({
        state: v?.state,
        subscribed: v?.subscribed,
        off: v?.off,
        hasPersistent: !!v?.persistentTrack,
        hasTrack: !!v?.track,
        userName: remote?.user_name,
      }));
    }
  }, [remote]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const toggleMic = async () => {
    const call = callRef.current; if (!call) return;
    const next = !micOn; setMicOn(next);
    try { await call.setLocalAudio(next); } catch (_) {}
  };
  const toggleCam = async () => {
    const call = callRef.current; if (!call) return;
    const next = !camOn; setCamOn(next);
    try { await call.setLocalVideo(next); } catch (_) {}
  };
  const flipCam = async () => {
    const call = callRef.current; if (!call) return;
    try { await call.cycleCamera(); } catch (_) {}
  };

  const localTracks = pickTracks(local);
  const remoteTracks = pickTracks(remote);
  const remoteConnected = !!remote;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Uzak taraf videosu (tam ekran) */}
      <View style={styles.remoteWrap}>
        {remoteConnected && remoteTracks.video && DailyMediaView ? (
          <DailyMediaView
            videoTrack={remoteTracks.video}
            audioTrack={remoteTracks.audio}
            mirror={false}
            objectFit="cover"
            style={styles.remoteVideo}
          />
        ) : (
          <View style={styles.remotePlaceholder}>
            <View style={styles.avatarBig}><Text style={styles.avatarBigText}>{(peerName || '?').charAt(0).toUpperCase()}</Text></View>
            <Text style={styles.peerName}>{peerName}</Text>
            <Text style={styles.callState}>
              {status === 'connecting' ? 'Bağlanıyor...' : status === 'error' ? 'Hata' : remoteConnected ? '' : 'Aranıyor...'}
            </Text>
            {status === 'connecting' && <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />}
            {status === 'error' && <Text style={styles.errText}>{errorMsg}</Text>}
          </View>
        )}
      </View>

      {/* Yerel önizleme (küçük PiP) */}
      {camOn && localTracks.video && DailyMediaView && (
        <View style={[styles.localWrap, { top: insets.top + 12 }]}>
          <DailyMediaView videoTrack={localTracks.video} audioTrack={null} mirror objectFit="cover" style={styles.localVideo} />
        </View>
      )}

      {/* Üst bilgi */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.topName}>{peerName}</Text>
        {status === 'joined' && <Text style={styles.topTimer}>{fmt(elapsed)}</Text>}
      </View>

      {/* Kontroller */}
      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <TouchableOpacity style={[styles.ctrlBtn, !micOn && styles.ctrlBtnOff]} onPress={toggleMic}>
          <Ionicons name={micOn ? 'mic' : 'mic-off'} size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctrlBtn, !camOn && styles.ctrlBtnOff]} onPress={toggleCam}>
          <Ionicons name={camOn ? 'videocam' : 'videocam-off'} size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.ctrlBtn} onPress={flipCam}>
          <Ionicons name="camera-reverse" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctrlBtn, styles.hangup]} onPress={onHangup}>
          <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0B1120', zIndex: 1000 },
  remoteWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  remoteVideo: { flex: 1, backgroundColor: '#0B1120' },
  remotePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  avatarBig: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  avatarBigText: { fontSize: 44, fontWeight: '800', color: '#fff' },
  peerName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  callState: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  errText: { fontSize: 13, color: '#FCA5A5', marginTop: 12, textAlign: 'center' },
  localWrap: { position: 'absolute', right: 14, width: 108, height: 156, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1E293B', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', zIndex: 1010 },
  localVideo: { flex: 1 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 8 },
  topName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  topTimer: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 18, paddingTop: 16 },
  ctrlBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  ctrlBtnOff: { backgroundColor: 'rgba(255,255,255,0.35)' },
  hangup: { backgroundColor: '#EF4444' },
});
