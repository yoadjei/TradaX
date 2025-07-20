const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '.');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.resolve(projectRoot, 'apps'),
  path.resolve(projectRoot, 'packages'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

config.resolver.disableHierarchicalLookup = true;

module.exports = config;
