const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Exclude .rnstorybook from bundling unless explicitly running Storybook
const STORYBOOK_ENABLED = process.env.EXPO_PUBLIC_STORYBOOK === 'true';
if (!STORYBOOK_ENABLED) {
  const stubPath = path.resolve(projectRoot, 'stubs/storybook-stub.js');
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName.includes('.rnstorybook') || moduleName.includes('rnstorybook')) {
      return { filePath: stubPath, type: 'sourceFile' };
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

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

// Enable package.json exports field resolution (needed for @storybook/react subpaths)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
