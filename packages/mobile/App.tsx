import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert, View, ActivityIndicator } from 'react-native';
import { api } from '@webportal/shared';

import { useAuthStore } from './src/features/auth/store/useAuthStore';
import { useThemeStore } from './src/store/useThemeStore';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { HomeScreen } from './src/features/home/screens/HomeScreen';
import { TicketScreen } from './src/features/ticket/screens/TicketScreen';
import { IzinScreen } from './src/features/izin/screens/IzinScreen';
import { TalepScreen } from './src/features/helpdesk/screens/TalepScreen';
import { BakimScreen } from './src/features/bakim_yonetim/screens/BakimScreen';
import { ProfilScreen } from './src/features/profile/screens/ProfilScreen';
import { PerformansScreen } from './src/features/profile/screens/PerformansScreen';
import { ZimmetlerimScreen } from './src/features/zimmet/screens/ZimmetlerimScreen';
import { DemirbasYonetimScreen } from './src/features/zimmet/screens/DemirbasYonetimScreen';
import { DemirbasSayimScreen } from './src/features/zimmet/screens/DemirbasSayimScreen';
import { TedarikciScreen } from './src/features/tedarikci/screens/TedarikciScreen';
import { AdminAyarlarScreen } from './src/features/admin/screens/AdminAyarlarScreen';
import { AdminKullaniciScreen } from './src/features/admin/screens/AdminKullaniciScreen';
import { AdminHelpDeskScreen } from './src/features/admin/screens/AdminHelpDeskScreen';
import { AdminLogsScreen } from './src/features/admin/screens/AdminLogsScreen';
import { AdminTarihceScreen } from './src/features/admin/screens/AdminTarihceScreen';
import { AlertModal } from './src/components/AlertModal';
import { useAlertStore } from './src/store/useAlertStore';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

// Globally override Alert.alert to use the premium AlertModal overlay
Alert.alert = (title?: string, message?: string, buttons?: any[], options?: any) => {
  if (buttons && buttons.length > 0) {
    const confirmBtn = buttons.find(b => b.text === 'Evet' || b.text === 'Tamam' || b.text === 'Gönder' || b.text === 'Kaydet' || b.text === 'Onayla');
    const cancelBtn = buttons.find(b => b.text === 'İptal' || b.style === 'cancel');
    
    const onConfirmPress = () => {
      const btn = confirmBtn || buttons[0];
      if (btn && btn.onPress) btn.onPress();
    };
    
    const onCancelPress = () => {
      const btn = cancelBtn || (buttons.length > 1 ? buttons[1] : null);
      if (btn && btn.onPress) btn.onPress();
    };

    useAlertStore.getState().showConfirm(
      title || 'Onay',
      message || '',
      onConfirmPress,
      buttons.length > 1 ? onCancelPress : undefined
    );
  } else {
    let type: 'success' | 'error' | 'warning' | 'info' = 'info';
    const lowerTitle = (title || '').toLowerCase();
    const lowerMsg = (message || '').toLowerCase();
    
    if (lowerTitle.includes('hata') || lowerMsg.includes('hata') || lowerMsg.includes('başarısız') || lowerTitle.includes('error') || lowerMsg.includes('olmadı') || lowerMsg.includes('bulunamadı')) {
      type = 'error';
    } else if (lowerTitle.includes('başarı') || lowerMsg.includes('başarı') || lowerTitle.includes('success') || lowerMsg.includes('kaydedildi') || lowerMsg.includes('tamamlandı')) {
      type = 'success';
    } else if (lowerTitle.includes('uyarı') || lowerMsg.includes('uyarı') || lowerTitle.includes('warning') || lowerMsg.includes('dikkat')) {
      type = 'warning';
    }
    
    useAlertStore.getState().showAlert(title || '', message || '', type);
  }
};

// Configure how notifications are displayed when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#009ef7',
    });
  }

  // Get project ID if configured in app.json (for Expo SDK 51/52+)
  let projectId = '34b84bb1-9215-4902-8c3d-137be6ef5766';

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: projectId,
  });
  
  return tokenData.data;
}

export default function App() {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const { colors } = useThemeStore();

  React.useEffect(() => {
    restoreSession();
  }, []);

  React.useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync()
        .then(token => {
          if (token) {
            console.log('Retrieved Expo Push Token:', token);
            api.savePushToken(token)
              .then(() => {
                console.log('Successfully saved push token to backend');
                Alert.alert('Bildirim Kaydı Başarılı', 'Bildirim altyapısı kuruldu.');
              })
              .catch(err => {
                console.warn('Error saving push token to backend:', err);
                Alert.alert('Veritabanı Hatası', 'Token sunucuya kaydedilemedi: ' + (err.message || err));
              });
          } else {
            console.log('Push notifications not registered (could be running on emulator/simulator)');
          }
        })
        .catch(err => {
          console.warn('Error registering for push notifications:', err);
          Alert.alert('Bildirim Hatası', 'Cihaz kaydı başarısız: ' + err);
        });
    }
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated) return;

    // Listen for notifications received while the app is in the foreground
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Received notification in foreground:', notification);
    });

    // Listen for notification clicks/taps
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification response received:', data);

      if (data && data.screen) {
        if (navigationRef.isReady()) {
          // Normalize screen name if it ends with "Screen"
          let targetScreen = data.screen;
          if (targetScreen === 'IzinScreen') targetScreen = 'Izin';
          if (targetScreen === 'TalepScreen') targetScreen = 'Talepler';
          if (targetScreen === 'BakimScreen') targetScreen = 'Bakim';
          if (targetScreen === 'TicketScreen') targetScreen = 'Ticket';
          if (targetScreen === 'HomeScreen') targetScreen = 'Home';
          if (targetScreen === 'ZimmetScreen' || targetScreen === 'Zimmet') targetScreen = 'Zimmetlerim';
          if (targetScreen === 'TedarikciScreen') targetScreen = 'Tedarikci';

          (navigationRef as any).navigate(targetScreen, {
            code: data.code,
            id: data.id,
            type: data.type
          });
        }
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <ActivityIndicator size="large" color="#009ef7" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen 
              name="Ticket" 
              component={TicketScreen} 
              options={{ 
                headerShown: true, 
                title: 'Bilet Yönetimi', 
                headerStyle: { backgroundColor: colors.navbarBg }, 
                headerTintColor: colors.navbarTint,
                headerTitleStyle: { fontWeight: '800' }
              }} 
            />
            <Stack.Screen 
              name="Izin" 
              component={IzinScreen} 
              options={{ 
                headerShown: true, 
                title: 'İzin İşlemleri', 
                headerStyle: { backgroundColor: colors.navbarBg }, 
                headerTintColor: colors.navbarTint,
                headerTitleStyle: { fontWeight: '800' }
              }} 
            />
            <Stack.Screen 
              name="IzinScreen" 
              component={IzinScreen} 
              options={{ 
                headerShown: true, 
                title: 'İzin İşlemleri', 
                headerStyle: { backgroundColor: colors.navbarBg }, 
                headerTintColor: colors.navbarTint,
                headerTitleStyle: { fontWeight: '800' }
              }} 
            />
            <Stack.Screen 
              name="Talepler" 
              component={TalepScreen} 
              options={{ 
                headerShown: false
              }} 
            />
            <Stack.Screen 
              name="Talep" 
              component={TalepScreen} 
              options={{ 
                headerShown: false
              }} 
            />
            <Stack.Screen 
              name="Bakim" 
              component={BakimScreen} 
              options={{ 
                headerShown: true, 
                title: 'Bakım Yönetimi', 
                headerStyle: { backgroundColor: colors.navbarBg }, 
                headerTintColor: colors.navbarTint,
                headerTitleStyle: { fontWeight: '800' }
              }} 
            />
            <Stack.Screen 
              name="Performans" 
              component={PerformansScreen} 
              options={{ 
                headerShown: true, 
                title: 'Performans Analizi', 
                headerStyle: { backgroundColor: colors.navbarBg }, 
                headerTintColor: colors.navbarTint,
                headerTitleStyle: { fontWeight: '800' }
              }} 
            />
            <Stack.Screen 
              name="Profil" 
              component={ProfilScreen} 
              options={{ 
                headerShown: true, 
                title: 'Profil Ayarları', 
                headerStyle: { backgroundColor: colors.navbarBg }, 
                headerTintColor: colors.navbarTint,
                headerTitleStyle: { fontWeight: '800' }
              }} 
            />
            <Stack.Screen 
              name="Zimmetlerim" 
              component={ZimmetlerimScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="DemirbasYonetim" 
              component={DemirbasYonetimScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="DemirbasSayim" 
              component={DemirbasSayimScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Tedarikci" 
              component={TedarikciScreen} 
              options={{ 
                headerShown: true, 
                title: 'Tedarikçi Değerlendirme', 
                headerStyle: { backgroundColor: colors.navbarBg }, 
                headerTintColor: colors.navbarTint,
                headerTitleStyle: { fontWeight: '800' }
              }} 
            />
            <Stack.Screen name="AdminAyarlar" component={AdminAyarlarScreen} />
            <Stack.Screen name="AdminKullanici" component={AdminKullaniciScreen} />
            <Stack.Screen name="AdminHelpDesk" component={AdminHelpDeskScreen} />
            <Stack.Screen name="AdminLogs" component={AdminLogsScreen} />
            <Stack.Screen name="AdminTarihce" component={AdminTarihceScreen} />
          </>
        )}
      </Stack.Navigator>
      <StatusBar style={colors.statusBar} />
      <AlertModal />
    </NavigationContainer>
  );
}

