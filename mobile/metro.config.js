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
const emptyShim = path.resolve(projectRoot, 'src/shims/empty.js');

const resolvePackage = (pkg) => {
  const local = path.resolve(projectRoot, 'node_modules', pkg);
  if (fs.existsSync(local) && fs.existsSync(path.join(local, 'package.json'))) return local;
  const root = path.resolve(monorepoRoot, 'node_modules', pkg);
  if (fs.existsSync(root) && fs.existsSync(path.join(root, 'package.json'))) return root;
  return emptyShim;
};

// Prevent duplicate React and React-Native instances and shim optional native packages
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@nutriflexs/shared': path.resolve(monorepoRoot, 'packages/shared/src'),
  'react': resolvePackage('react'),
  'react-native': resolvePackage('react-native'),
  'expo-notifications': resolvePackage('expo-notifications'),
  'expo-haptics': resolvePackage('expo-haptics'),
  'react-native-reanimated': resolvePackage('react-native-reanimated'),
  'expo-secure-store': resolvePackage('expo-secure-store'),
  '@react-native-async-storage/async-storage': resolvePackage('@react-native-async-storage/async-storage'),
};

module.exports = config;
