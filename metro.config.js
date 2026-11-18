const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Enable symlinks for pnpm
config.resolver.unstable_enableSymlinks = true;

// Explicitly tell Metro where to look for modules with pnpm
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(projectRoot, 'node_modules/.pnpm/node_modules'),
];

module.exports = config;
