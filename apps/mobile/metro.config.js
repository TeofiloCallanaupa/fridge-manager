const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo root
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Append monorepo root to Expo's default watch folders (don't replace)
config.watchFolders = [...(config.watchFolders || []), monorepoRoot];

// Ensure Metro resolves from both the app and monorepo node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
