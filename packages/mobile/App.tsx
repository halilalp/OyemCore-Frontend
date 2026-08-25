import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Constants from 'expo-constants';

let Notifications: any = {
  setNotificationHandler: () => {},
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  getPermissionsAsync: async () => ({ status: 'denied' }),
  requestPermissionsAsync: async () => ({ status: 'denied' }),
  getExpoPushTokenAsync: async () => ({ data: '' }),
  getLastNotificationResponseAsync: async () => null,
  setNotificationChannelAsync: async () => {},
  AndroidImportance: { MAX: 4 },
};

try {
  const dev = require('expo-device');
  const isExpoGo = Constants.appOwnership === 'expo';
  const isEmulator = !dev.isDevice;
  
  if (!isExpoGo && !isEmulator) {
    Notifications = require('expo-notifications');
  } else {
    console.log(`Notifications mocked - Expo Go: ${isExpoGo}, Emulator: ${isEmulator}`);
  }
} catch (e) {
  console.warn('expo-notifications could not be loaded:', e);
}

import * as Device from 'expo-device';
import { Platform, Alert, View, ActivityIndicator, LogBox, Text, TouchableOpacity } from 'react-native';
LogBox.ignoreAllLogs();
import { api, setUnauthorizedHandler } from '@oyemcore/shared';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from './src/features/auth/store/useAuthStore';
import { useThemeStore } from './src/store/useThemeStore';
import { LoginScreen } from './src/features/auth/screens/LoginScreen';
import { HomeScreen } from './src/features/home/screens/HomeScreen';
import { TicketScreen } from './src/features/ticket/screens/TicketScreen';

const DummyScreen = (title: string, targetScreen?: string, targetLabel?: string) => ({ navigation }: any) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: 20 }}>
    <Text style={{ fontSize: 18, color: '#333333', fontWeight: '700' }}>{title}</Text>
    <Text style={{ fontSize: 13, color: '#666666', marginTop: 8, textAlign: 'center', marginBottom: 20 }}>
      Bu ekran mobil uygulama için yakında aktif edilecektir.
    </Text>
    {targetScreen && (
      <TouchableOpacity
        style={{
          backgroundColor: '#0052cc',
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 8,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 1.41
        }}
        onPress={() => navigation.navigate(targetScreen)}
      >
        <Text style={{ color: '#ffffff', fontWeight: '600' }}>{targetLabel || 'İşlemlere Git'}</Text>
      </TouchableOpacity>
    )}
  </View>
);

import { TicketDashboardScreen } from './src/features/ticket/screens/TicketDashboardScreen';
import { BakimDashboardScreen } from './src/features/bakim_yonetim/screens/BakimDashboardScreen';
import { IzinDashboardScreen } from './src/features/izin/screens/IzinDashboardScreen';
import { HelpDeskDashboardScreen } from './src/features/helpdesk/screens/HelpDeskDashboardScreen';
import { ZimmetDashboardScreen } from './src/features/zimmet/screens/ZimmetDashboardScreen';
import { TedarikciDashboardScreen } from './src/features/tedarikci/screens/TedarikciDashboardScreen';
import { PatronDashboardScreen } from './src/features/dashboard/screens/PatronDashboardScreen';
const CalendarScreen = DummyScreen('Takvim');

import { BakimRaporScreen } from './src/features/bakim_yonetim/screens/BakimRaporScreen';
import { BakimPlanScreen } from './src/features/bakim_yonetim/screens/BakimPlanScreen';
import { ProjeListScreen } from './src/features/proje/screens/ProjeListScreen';
import { ProjeDetailScreen } from './src/features/proje/screens/ProjeDetailScreen';
import { PeriyodikKontrolScreen } from './src/features/bakim_yonetim/screens/PeriyodikKontrolScreen';
import { IzinScreen } from './src/features/izin/screens/IzinScreen';
import { IzinDetailScreen } from './src/features/izin/screens/IzinDetailScreen';

import { ITHelpDeskScreen } from './src/features/helpdesk/screens/ITHelpDeskScreen';
import { ERPHelpDeskScreen } from './src/features/helpdesk/screens/ERPHelpDeskScreen';
import { BakimHelpDeskScreen } from './src/features/helpdesk/screens/BakimHelpDeskScreen';
import { ChatListScreen } from './src/features/chat/screens/ChatListScreen';
import { ChatConversationScreen } from './src/features/chat/screens/ChatConversationScreen';
import { GameScreen } from './src/features/game/screens/GameScreen';
import { AnketVoteScreen } from './src/features/anket/screens/AnketVoteScreen';
import { AnketListScreen } from './src/features/anket/screens/AnketListScreen';
import { AvansMasrafScreen } from './src/features/avansmasraf/screens/AvansMasrafScreen';
import { AvansMasrafDetailScreen } from './src/features/avansmasraf/screens/AvansMasrafDetailScreen';
import { BakimYonetimHubScreen } from './src/features/bakim_yonetim/screens/BakimYonetimHubScreen';
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
import { TrainingScreen } from './src/features/home/screens/TrainingScreen';
import { AnnouncementScreen } from './src/features/home/screens/AnnouncementScreen';
import { SatSasScreen } from './src/features/satsas/screens/SatSasScreen';
import { SatDetailScreen } from './src/features/satsas/screens/SatDetailScreen';
import { SasDetailScreen } from './src/features/satsas/screens/SasDetailScreen';
import { BordroScreen } from './src/features/bordro/screens/BordroScreen';
import { MalzemeListesiScreen } from './src/features/malzeme/screens/MalzemeListesiScreen';
import { MalzemeStokHubScreen } from './src/features/malzeme/screens/MalzemeStokHubScreen';
import { MalzemeGrubuScreen } from './src/features/malzeme/screens/MalzemeGrubuScreen';
import { MalzemeTedarikciKodlariScreen } from './src/features/malzeme/screens/MalzemeTedarikciKodlariScreen';
import { FizikselAnalizTanimlariScreen } from './src/features/malzeme/screens/FizikselAnalizTanimlariScreen';
import { StokDashboardScreen } from './src/features/malzeme/screens/StokDashboardScreen';
import { StokDurumRaporuScreen } from './src/features/malzeme/screens/StokDurumRaporuScreen';
import { StokHareketleriScreen } from './src/features/malzeme/screens/StokHareketleriScreen';
import { StokFisleriScreen } from './src/features/malzeme/screens/StokFisleriScreen';
import { FizikselAnalizGirisiScreen } from './src/features/malzeme/screens/FizikselAnalizGirisiScreen';
import { DepoKartlariScreen } from './src/features/malzeme/screens/DepoKartlariScreen';
import { AdminMalzemeAyarlariScreen } from './src/features/admin/screens/AdminMalzemeAyarlariScreen';
import { AdminDepoSorumlulariScreen } from './src/features/admin/screens/AdminDepoSorumlulariScreen';
import { OzellikTanimlariScreen } from './src/features/malzeme/screens/OzellikTanimlariScreen';
import { VaryantScreen } from './src/features/malzeme/screens/VaryantScreen';
import { InAppNotification } from './src/components/InAppNotification';
import { CallProvider } from './src/features/chat/call/CallProvider';
import { AnimatedSplash } from './src/components/AnimatedSplash';
import { useNotificationStore } from './src/store/useNotificationStore';
import { navigationRef, navigateFromNotificationData } from './src/navigation/navigationRef';

const Stack = createNativeStackNavigator();
// Geriye dönük uyumluluk için navigationRef'i buradan da dışa aktarıyoruz.
export { navigationRef };

// Globally override Alert.alert to use the premium AlertModal overlay
const nativeAlert = Alert.alert.bind(Alert);
Alert.alert = (title?: string, message?: string, buttons?: any[], options?: any) => {
  if (buttons && buttons.length > 0) {
    // Onay/çok-butonlu diyaloglar: her zaman sistem native alert'i. Özel AlertModal,
    // fullScreen bir form modalı açıkken iOS'ta modalın ARKASINDA kalıyordu; native
    // alert her zaman en üstte gösterilir (form açıkken bile).
    nativeAlert(title, message, buttons, options);
    return;
  } else {
    // Tek butonlu bilgi/başarı/hata uyarıları: sistem native alert'i kullanılır.
    // Neden: özel AlertModal, fullScreen bir modal (kayıt/güncelleme formu) açıkken
    // iOS'ta modalın ARKASINDA kalıyor ve uyarı ancak form kapandıktan sonra
    // görünüyordu. Native alert her zaman en üstte gösterilir (form açıkken bile).
    nativeAlert(title || '', message || '');
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
      shouldSetBadge: true, // ikon rozeti güncellensin (iOS + OEM Android)
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

  // İlk açılış animasyonunun tam oynaması için minimum gösterim süresi.
  const [splashMinDone, setSplashMinDone] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setSplashMinDone(true), 2100);
    return () => clearTimeout(t);
  }, []);

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
              })
              .catch(err => {
                console.warn('Error saving push token to backend:', err);
              });
          } else {
            console.log('Push notifications not registered (could be running on emulator/simulator)');
          }
        })
        .catch(err => {
          console.warn('Error registering for push notifications:', err);
        });
    }
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!isAuthenticated || !Device.isDevice) return;

    let notificationListener: any;
    let responseListener: any;

    try {
      // Uygulama ön plandayken gelen bildirimi uygulama içi banner olarak göster.
      // Dokunulunca banner kendisi ilgili işleme yönlendirir.
      notificationListener = Notifications.addNotificationReceivedListener(notification => {
        try {
          const content = notification?.request?.content || {};
          const data = content.data || {};

          // Görüntülü/sesli arama ise doğrudan arama ekranını tetikle, banner gösterme!
          const isCall = data.roomUrl || data.RoomUrl || 
                         data.screen === 'IncomingCall' || data.Screen === 'IncomingCall' || 
                         data.screen === 'Call' || data.Screen === 'Call' || 
                         data.type === 'call' || data.Type === 'call';
          if (isCall) {
            if ((globalThis as any).triggerIncomingCallNotification) {
              (globalThis as any).triggerIncomingCallNotification({
                callerSicilNo: data.callerSicilNo || data.CallerSicilNo || data.targetSicilNo || data.TargetSicilNo || '',
                callerName: data.callerName || data.CallerName || data.targetName || data.TargetName || 'Arayan',
                roomUrl: data.roomUrl || data.RoomUrl,
                callType: data.callType || data.CallType || 'video',
                callerImage: data.callerImage || data.CallerImage || '',
              });
            }
            return;
          }

          useNotificationStore.getState().showNotification(
            content.title || 'Bildirim',
            content.body || '',
            data
          );
        } catch (e) {
          console.warn('In-app notification banner failed:', e);
        }
      });

      // Kullanıcı sistem bildirimine (arka plan/kilit ekranı) dokunduğunda:
      // doğrudan yönlendirmek yerine uygulama içi banner (popup) göster; kullanıcı
      // isterse banner'a dokunup ilgili işlem detayına gider.
      responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        try {
          const content = response?.notification?.request?.content || {};
          const data = content.data || {};

          // Görüntülü/sesli arama ise doğrudan arama ekranını tetikle, banner gösterme!
          const isCall = data.roomUrl || data.RoomUrl || 
                         data.screen === 'IncomingCall' || data.Screen === 'IncomingCall' || 
                         data.screen === 'Call' || data.Screen === 'Call' || 
                         data.type === 'call' || data.Type === 'call';
          if (isCall) {
            if ((globalThis as any).triggerIncomingCallNotification) {
              (globalThis as any).triggerIncomingCallNotification({
                callerSicilNo: data.callerSicilNo || data.CallerSicilNo || data.targetSicilNo || data.TargetSicilNo || '',
                callerName: data.callerName || data.CallerName || data.targetName || data.TargetName || 'Arayan',
                roomUrl: data.roomUrl || data.RoomUrl,
                callType: data.callType || data.CallType || 'video',
                callerImage: data.callerImage || data.CallerImage || '',
              });
            }
            return;
          }

          useNotificationStore.getState().showNotification(
            content.title || 'Bildirim',
            content.body || '',
            data
          );
        } catch (e) {
          console.warn('Notification response banner failed:', e);
        }
      });

      // Soğuk başlangıç: uygulama tamamen kapalıyken bildirime dokunulup açıldıysa,
      // doğrudan arama ekranını tetikle (kısa gecikme ile, UI hazır olsun).
      if (Notifications.getLastNotificationResponseAsync) {
        Notifications.getLastNotificationResponseAsync()
          .then((response: any) => {
            const content = response?.notification?.request?.content;
            if (content) {
              const data = content.data || {};
              setTimeout(() => {
                const isCall = data.roomUrl || data.RoomUrl || 
                               data.screen === 'IncomingCall' || data.Screen === 'IncomingCall' || 
                               data.screen === 'Call' || data.Screen === 'Call' || 
                               data.type === 'call' || data.Type === 'call';
                if (isCall) {
                  if ((globalThis as any).triggerIncomingCallNotification) {
                    (globalThis as any).triggerIncomingCallNotification({
                      callerSicilNo: data.callerSicilNo || data.CallerSicilNo || data.targetSicilNo || data.TargetSicilNo || '',
                      callerName: data.callerName || data.CallerName || data.targetName || data.TargetName || 'Arayan',
                      roomUrl: data.roomUrl || data.RoomUrl,
                      callType: data.callType || data.CallType || 'video',
                      callerImage: data.callerImage || data.CallerImage || '',
                    });
                  }
                  return;
                }
                useNotificationStore.getState().showNotification(
                  content.title || 'Bildirim',
                  content.body || '',
                  data
                );
              }, 1200);
            }
          })
          .catch(() => {});
      }
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

  if (isLoading || !splashMinDone) {
    return <AnimatedSplash />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <CallProvider>
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
              name="IzinDetail" 
              component={IzinDetailScreen} 
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
              name="ChatList"
              component={ChatListScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ChatConversation"
              component={ChatConversationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Game"
              component={GameScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AnketVote"
              component={AnketVoteScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AnketList"
              component={AnketListScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AvansMasraf"
              component={AvansMasrafScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AvansMasrafDetail"
              component={AvansMasrafDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Bordro"
              component={BordroScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="TicketDashboard" component={TicketDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PatronDashboard" component={PatronDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BakimYonetim" component={BakimYonetimHubScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BakimDashboard" component={BakimDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BakimRapor" component={BakimRaporScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BakimPlan" component={BakimPlanScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ProjeList" component={ProjeListScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ProjeDetail" component={ProjeDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PeriyodikKontrol" component={PeriyodikKontrolScreen} options={{ headerShown: false }} />
            <Stack.Screen name="IzinDashboard" component={IzinDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="HelpDeskDashboard" component={HelpDeskDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ZimmetDashboard" component={ZimmetDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="TedarikciDashboard" component={TedarikciDashboardScreen} options={{ headerShown: false }} />
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
            <Stack.Screen name="MalzemeStokHub" component={MalzemeStokHubScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MalzemeListesi" component={MalzemeListesiScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MalzemeGrubu" component={MalzemeGrubuScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MalzemeTedarikciKodlari" component={MalzemeTedarikciKodlariScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FizikselAnalizTanimlari" component={FizikselAnalizTanimlariScreen} options={{ headerShown: false }} />
            <Stack.Screen name="StokDashboard" component={StokDashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="StokDurumRaporu" component={StokDurumRaporuScreen} options={{ headerShown: false }} />
            <Stack.Screen name="StokHareketleri" component={StokHareketleriScreen} options={{ headerShown: false }} />
            <Stack.Screen name="StokFisleri" component={StokFisleriScreen} options={{ headerShown: false }} />
            <Stack.Screen name="FizikselAnalizGirisi" component={FizikselAnalizGirisiScreen} options={{ headerShown: false }} />
            <Stack.Screen name="DepoKartlari" component={DepoKartlariScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AdminMalzemeAyarlari" component={AdminMalzemeAyarlariScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AdminDepoSorumlulari" component={AdminDepoSorumlulariScreen} options={{ headerShown: false }} />
            <Stack.Screen name="OzellikTanimlari" component={OzellikTanimlariScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Varyant" component={VaryantScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
      <StatusBar style={colors.statusBar} />
      <InAppNotification />
      </CallProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );


}
