const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files within the monorepo so Metro picks up workspace package changes
config.watchFolders = [workspaceRoot];

// Resolve packages from both the app's and the workspace root's node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Disable hierarchical lookup so Metro uses nodeModulesPaths instead of
// walking up directories — required for pnpm's non-hoisted node_modules
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
