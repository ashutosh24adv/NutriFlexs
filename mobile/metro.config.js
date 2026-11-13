const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

let config;
try {
  config = getDefaultConfig(projectRoot);
} catch {
  // Fallback config when expo/metro-config is resolved in monorepo root or mock context
  config = {
    resolver: {},
    transformer: {},
    serializer: {},
    server: {},
  };
}

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies from nodeModulesPaths
config.resolver.disableHierarchicalLookup = false;

const fs = require('fs');
const resolvePackage = (pkg) => {
  const local = path.resolve(projectRoot, 'node_modules', pkg);
  if (fs.existsSync(local)) return local;
  return path.resolve(monorepoRoot, 'node_modules', pkg);
};

// Prevent duplicate React and React-Native instances
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@nutriflexs/shared': path.resolve(monorepoRoot, 'packages/shared/src'),
  'react': resolvePackage('react'),
  'react-native': resolvePackage('react-native'),
};

module.exports = config;
