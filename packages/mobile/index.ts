import './src/polyfills';
import { LogBox } from 'react-native';

// TEŞHİS (2026-09-22): LogBox'ın kendisi bir hatayı ekrana basmaya çalışırken
// "Cannot read property 'setTimeout' of null" ile çöküp sonsuz döngüye giriyordu —
// uygulama daha login ekranına gelmeden donuyordu. Asıl hatayı (LogBox'ın gizlediği)
// görebilmek için geçici olarak devre dışı bırakıldı.
LogBox.ignoreAllLogs(true);

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
