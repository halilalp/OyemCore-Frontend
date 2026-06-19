import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { api } from '@webportal/shared';

import { useAuthStore } from './src/store/useAuthStore';
import { useThemeStore } from './src/store/useThemeStore';
import { LoginScreen } from './src/screens/LoginScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TicketScreen } from './src/screens/TicketScreen';
import { IzinScreen } from './src/screens/IzinScreen';
import { TalepScreen } from './src/screens/TalepScreen';
import { BakimScreen } from './src/screens/BakimScreen';
import { ProfilScreen } from './src/screens/ProfilScreen';
import { PerformansScreen } from './src/screens/PerformansScreen';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef();

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
  const { isAuthenticated } = useAuthStore();
  const { colors } = useThemeStore();

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
                console.error('Error saving push token to backend:', err);
                Alert.alert('Veritabanı Hatası', 'Token sunucuya kaydedilemedi: ' + (err.message || err));
              });
          } else {
            Alert.alert('Bildirim Hatası', 'Bildirim tokeni alınamadı.');
          }
        })
        .catch(err => {
          console.error('Error registering for push notifications:', err);
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
          </>
        )}
      </Stack.Navigator>
      <StatusBar style={colors.statusBar} />
    </NavigationContainer>
  );
}

