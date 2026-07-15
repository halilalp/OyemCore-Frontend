const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Yalnızca gerçekten var olan workspace kökünü izle. Sabit Windows yolları (örn. Z: / D:)
// EAS'in Linux build sunucusunda mevcut olmadığı için Metro paketlemesini bozuyordu.
config.watchFolders = [
  ...config.watchFolders,
  workspaceRoot,
].filter((dir) => {
  try {
    return fs.existsSync(dir);
  } catch {
    return false;
  }
});

// react-native-gifted-charts try/catch ile 'react-native-linear-gradient' require ediyor;
// Expo projesinde bu paket yok. Metro statik çözümlemede hata vermesin diye
// expo-linear-gradient'e yönlendiriyoruz (API uyumlu: LinearGradient named export).
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'react-native-linear-gradient': require.resolve('expo-linear-gradient'),
};

module.exports = config;
