// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '.');

const config = getDefaultConfig(projectRoot);

// --- your original monorepo settings ---
config.watchFolders = [
  path.resolve(projectRoot, 'apps'),
  path.resolve(projectRoot, 'packages'),
];

config.resolver = {
  ...(config.resolver || {}),
  nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')],
  disableHierarchicalLookup: true,

  // 👇 **THE IMPORTANT FIX**
  alias: {
    ...(config.resolver?.alias || {}),
    'entities/lib/maps/entities.json': require.resolve(
      'entities/lib/maps/entities.json.js'
    ),
  },
};

module.exports = config;
