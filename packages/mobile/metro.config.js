const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = fs.realpathSync(__dirname);
const workspaceRoot = fs.realpathSync(path.resolve(projectRoot, '../..'));

const mapZToD = (p) => {
  if (p.startsWith('Z:\\')) {
    return 'D:\\Solutions\\OyemCore\\OyemCoreSolution\\OyemCore-Frontend\\' + p.substring(3);
  }
  if (p.startsWith('Z:/')) {
    return 'D:/Solutions/OyemCore/OyemCoreSolution/OyemCore-Frontend/' + p.substring(3);
  }
  return p;
};

const dWorkspaceRoot = mapZToD(workspaceRoot);
const dProjectRoot = mapZToD(projectRoot);

const config = getDefaultConfig(projectRoot);

// Yalnızca gerçekten var olan workspace kökünü izle. Sabit Windows yolları (örn. Z: / D:)
// EAS'in Linux build sunucusunda mevcut olmadığı için Metro paketlemesini bozuyordu.
config.watchFolders = [
  ...config.watchFolders,
  workspaceRoot,
  dWorkspaceRoot,
].filter((dir) => {
  try {
    return fs.existsSync(dir);
  } catch {
    return false;
  }
});

config.resolver.unstable_enableSymlinks = true;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(dProjectRoot, 'node_modules'),
  path.resolve(dWorkspaceRoot, 'node_modules'),
];

// react-native-gifted-charts try/catch ile 'react-native-linear-gradient' require ediyor;
// Expo projesinde bu paket yok. Metro statik çözümlemede hata vermesin diye
// expo-linear-gradient'e yönlendiriyoruz (API uyumlu: LinearGradient named export).
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'react-native-linear-gradient': require.resolve('expo-linear-gradient'),
};

console.log("METRO CONFIG DEBUG INFO:");
console.log("projectRoot:", projectRoot);
console.log("workspaceRoot:", workspaceRoot);
console.log("watchFolders:", config.watchFolders);
console.log("nodeModulesPaths:", config.resolver.nodeModulesPaths);

module.exports = config;
