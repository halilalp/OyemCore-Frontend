import './src/polyfills';
import { registerRootComponent } from 'expo';
import App from './App';
import { registerAndroidBackgroundCallHandler } from './src/features/chat/call/nativeCallBridge';

// Android'de uygulama tamamen kapalıyken de gelen arama FCM data mesajını yakalayabilmek için
// bu, React bileşen ağacı hiç kurulmadan, MODÜL SEVİYESİNDE (import zamanında) çağrılmalı.
registerAndroidBackgroundCallHandler();

registerRootComponent(App);
