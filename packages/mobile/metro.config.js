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

module.exports = config;
