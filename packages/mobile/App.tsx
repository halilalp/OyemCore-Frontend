import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
let Notifications: any = {
  setNotificationHandler: () => {},
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  getPermissionsAsync: async () => ({ status: 'denied' }),
  requestPermissionsAsync: async () => ({ status: 'denied' }),
  getExpoPushTokenAsync: async () => ({ data: '' }),
  setNotificationChannelAsync: async () => {},
  AndroidImportance: { MAX: 4 },
};

try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.warn('expo-notifications could not be loaded:', e);
}

import * as Device from 'expo-device';
import { Platform, Alert, View, ActivityIndicator, LogBox } from 'react-native';
LogBox.ignoreAllLogs();
import { api, setUnauthorizedHandler } from '@oyemcore/shared';

import { useAuthStore } from './src/features/auth/store/useAuthStore';
import { useThemeStore } from './src/store/useThemeStore';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { HomeScreen } from './src/features/home/screens/HomeScreen';
import { TicketScreen } from './src/features/ticket/screens/TicketScreen';
import { TicketDashboardScreen } from './src/features/ticket/screens/TicketDashboardScreen';
import { BakimDashboardScreen } from './src/features/bakim_yonetim/screens/BakimDashboardScreen';
import { IzinScreen } from './src/features/izin/screens/IzinScreen';
import { IzinDashboardScreen } from './src/features/izin/screens/IzinDashboardScreen';
import { HelpDeskDashboardScreen } from './src/features/helpdesk/screens/HelpDeskDashboardScreen';
import { ZimmetDashboardScreen } from './src/features/zimmet/screens/ZimmetDashboardScreen';
import { ITHelpDeskScreen } from './src/features/helpdesk/screens/ITHelpDeskScreen';
import { ERPHelpDeskScreen } from './src/features/helpdesk/screens/ERPHelpDeskScreen';
import { BakimHelpDeskScreen } from './src/features/helpdesk/screens/BakimHelpDeskScreen';
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
import { AdminHiyerarsiScreen } from './src/features/admin/screens/AdminHiyerarsiScreen';
import { AdminLogsScreen } from './src/features/admin/screens/AdminLogsScreen';
import { AdminTarihceScreen } from './src/features/admin/screens/AdminTarihceScreen';
import { CalendarScreen } from './src/features/home/screens/CalendarScreen';
import { TrainingScreen } from './src/features/home/screens/TrainingScreen';
import { AnnouncementScreen } from './src/features/home/screens/AnnouncementScreen';
import { SatSasScreen } from './src/features/satsas/screens/SatSasScreen';
import { SatDetailScreen } from './src/features/satsas/screens/SatDetailScreen';
import { SasDetailScreen } from './src/features/satsas/screens/SasDetailScreen';
import { AlertModal } from './src/components/AlertModal';
import { useAlertStore } from './src/store/useAlertStore';
import { InAppNotification } from './src/components/InAppNotification';
import { useNotificationStore } from './src/store/useNotificationStore';
import { navigationRef, navigateFromNotificationData } from './src/navigation/navigationRef';

const Stack = createNativeStackNavigator();
// Geriye dönük uyumluluk için navigationRef'i buradan da dışa aktarıyoruz.
export { navigationRef };

// Globally override Alert.alert to use the premium AlertModal overlay
const nativeAlert = Alert.alert.bind(Alert);
Alert.alert = (title?: string, message?: string, buttons?: any[], options?: any) => {
  if (buttons && buttons.length > 0) {
    const confirmBtn = buttons.find(b => b.text === 'Evet' || b.text === 'Tamam' || b.text === 'Gönder' || b.text === 'Kaydet' || b.text === 'Onayla');
    const cancelBtn = buttons.find(b => b.text === 'İptal' || b.style === 'cancel');

    // AlertModal yalnızca Evet/İptal kalıbındaki onayları temsil edebilir. 3+ buton veya
    // tanınmayan etiketler (örn. "Kamera" / "Dosya Seç") varsa seçenek kaybetmemek için
    // native Alert'e geri düş.
    if (buttons.length > 2 || (!confirmBtn && buttons.length > 1)) {
      nativeAlert(title, message, buttons, options);
      return;
    }

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
try {
  Notifications.setNotificationHandler({
    // Ön planda OS'in kendi banner'ını göstermiyoruz; onun yerine uygulama içi
    // özel banner (InAppNotification) gösteriliyor. Böylece çift bildirim olmuyor.
    // Ses ve bildirim merkezindeki liste kaydı korunuyor.
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn('setNotificationHandler failed:', e);
}

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
      lightColor: '#2F5FE8',
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
  const { isAuthenticated, isLoading, restoreSession, logout } = useAuthStore();
  const { colors } = useThemeStore();

  React.useEffect(() => {
    restoreSession();
  }, []);

  // Oturum süresi dolduğunda (401) kullanıcıyı otomatik çıkışa alıp Login ekranına döndürür.
  // apiClient bu handler'ı platformdan bağımsız çalışabilmek için @oyemcore/shared üzerinden çağırır.
  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      Alert.alert('Oturum Süresi Doldu', 'Lütfen tekrar giriş yapın.');
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

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

    let notificationListener: any;
    let responseListener: any;

    try {
      // Uygulama ön plandayken gelen bildirimi uygulama içi banner olarak göster.
      // Dokunulunca banner kendisi ilgili işleme yönlendirir.
      notificationListener = Notifications.addNotificationReceivedListener(notification => {
        try {
          const content = notification?.request?.content || {};
          useNotificationStore.getState().showNotification(
            content.title || 'Bildirim',
            content.body || '',
            content.data || null
          );
        } catch (e) {
          console.warn('In-app notification banner failed:', e);
        }
      });

      // Kullanıcı sistem bildirimine (arka plan/kilit ekranı) dokunduğunda
      // ilgili işleme yönlendir.
      responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        navigateFromNotificationData(data);
      });
    } catch (e) {
      console.warn('Failed to register notification listeners in Expo Go:', e);
    }

    return () => {
      try {
        if (notificationListener) notificationListener.remove();
        if (responseListener) responseListener.remove();
      } catch (e) {
        console.warn('Failed to remove notification listeners:', e);
      }
    };
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
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
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Izin" 
              component={IzinScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="IzinScreen" 
              component={IzinScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="ITHelpDesk" 
              component={ITHelpDeskScreen} 
              options={{ 
                headerShown: false
              }} 
            />
            <Stack.Screen 
              name="ERPHelpDesk" 
              component={ERPHelpDeskScreen} 
              options={{ 
                headerShown: false
              }} 
            />
            <Stack.Screen 
              name="BakimHelpDesk" 
              component={BakimHelpDeskScreen} 
              options={{ 
                headerShown: false
              }} 
            />
            <Stack.Screen
              name="Bakim"
              component={BakimScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="TicketDashboard" component={TicketDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BakimDashboard" component={BakimDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="IzinDashboard" component={IzinDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="HelpDeskDashboard" component={HelpDeskDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ZimmetDashboard" component={ZimmetDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen 
              name="Performans" 
              component={PerformansScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="Profil" 
              component={ProfilScreen} 
              options={{ headerShown: false }} 
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
              options={{ headerShown: false }} 
            />
            <Stack.Screen name="AdminAyarlar" component={AdminAyarlarScreen} />
            <Stack.Screen name="AdminKullanici" component={AdminKullaniciScreen} />
            <Stack.Screen name="AdminHelpDesk" component={AdminHelpDeskScreen} />
            <Stack.Screen name="AdminHiyerarsi" component={AdminHiyerarsiScreen} />
            <Stack.Screen name="AdminLogs" component={AdminLogsScreen} />
            <Stack.Screen name="AdminTarihce" component={AdminTarihceScreen} />
            <Stack.Screen name="Calendar" component={CalendarScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Training" component={TrainingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Announcement" component={AnnouncementScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SatSas" component={SatSasScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SatDetail" component={SatDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SasDetail" component={SasDetailScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
      <StatusBar style={colors.statusBar} />
      <InAppNotification />
      <AlertModal />
    </NavigationContainer>
  );


}
