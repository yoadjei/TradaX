const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '.');

const config = getDefaultConfig(projectRoot);

// Watch your monorepo folders
config.watchFolders = [
  path.resolve(projectRoot, 'apps'),
  path.resolve(projectRoot, 'packages'),
];

// Use only the root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Prevent Metro from looking outside workspace
config.resolver.disableHierarchicalLookup = true;

// Add support for resolving custom aliases like @tradax/*
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_, name) =>
      path.join(projectRoot, 'node_modules', name),
  }
);

module.exports = config;
