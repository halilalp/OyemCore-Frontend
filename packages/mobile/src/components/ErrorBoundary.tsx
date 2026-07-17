import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Render sırasında oluşan bir hata tüm uygulamayı kapatmasın diye kullanılır.
// Hatayı yakalar, kullanıcıya anlaşılır bir ekran gösterir ve hatanın gerçek
// mesajını ekranda gösterir (cihazda log alamadan kök nedeni görebilmek için).
interface Props {
  children: React.ReactNode;
  title?: string;
  onClose?: () => void;
}
interface State {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary yakaladı:', error, info?.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children as any;

    const err = this.state.error;
    const msg = err?.message || String(err || 'Bilinmeyen hata');
    const stack = (err?.stack || '').split('\n').slice(0, 6).join('\n');

    return (
      <View style={styles.wrap}>
        <Ionicons name="warning-outline" size={44} color="#ef4444" />
        <Text style={styles.title}>{this.props.title || 'Bu ekran açılamadı'}</Text>
        <Text style={styles.sub}>
          Uygulama kapanmadı. Aşağıdaki hata mesajını geliştiriciye iletebilirsiniz.
        </Text>
        <ScrollView style={styles.box} contentContainerStyle={{ padding: 12 }}>
          <Text selectable style={styles.msg}>{msg}</Text>
          {!!stack && <Text selectable style={styles.stack}>{stack}</Text>}
        </ScrollView>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={this.reset}>
            <Text style={styles.btnGhostText}>Tekrar Dene</Text>
          </TouchableOpacity>
          {!!this.props.onClose && (
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={this.props.onClose}>
              <Text style={styles.btnPrimaryText}>Kapat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { fontSize: 17, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  sub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 6 },
  box: { maxHeight: 240, width: '100%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  msg: { fontSize: 12, fontWeight: '700', color: '#b91c1c' },
  stack: { fontSize: 10, color: '#64748b', marginTop: 8 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { height: 44, paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  btnGhostText: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  btnPrimary: { backgroundColor: '#3b82f6' },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
