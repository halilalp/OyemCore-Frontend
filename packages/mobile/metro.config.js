const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRootZ = path.resolve(projectRoot, '../..');
const workspaceRootD = 'D:\\Solutions\\OyemCore\\OyemCoreSolution\\OyemCore-Frontend';

const config = getDefaultConfig(projectRoot);

// Only extend watchFolders to include both Z and D workspace paths,
// leaving resolver.nodeModulesPaths to default so that Metro's internal resolution works normally.
config.watchFolders = [
  ...config.watchFolders,
  workspaceRootZ,
  workspaceRootD,
];

module.exports = config;
