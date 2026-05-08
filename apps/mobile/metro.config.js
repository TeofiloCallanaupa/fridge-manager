const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Append monorepo root to Expo's default watch folders
config.watchFolders = [...(config.watchFolders || []), monorepoRoot];

// Resolve from both the app and monorepo node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// In the hoisted monorepo, multiple React versions exist (mobile=19.1.0, web=19.2.4).
// Pin single-instance packages so Metro always resolves the mobile-compatible versions.
config.resolver.extraNodeModules = {
  react: path.resolve(monorepoRoot, 'node_modules/react'),
  'react-dom': path.resolve(monorepoRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(monorepoRoot, 'node_modules/react-native'),
};

// Block Metro from resolving into nested node_modules that contain a different React
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react\//,
];

module.exports = config;
