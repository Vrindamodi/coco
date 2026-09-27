const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite on web ships its sqlite3 build as a wasm asset.
config.resolver.assetExts.push('wasm');

// NOTE: we deliberately use only expo-sqlite's async API (see src/db/database.ts).
// The sync API needs SharedArrayBuffer, which requires COOP/COEP headers that the
// Expo dev server cannot reliably serve (its middleware runs before metro's).
module.exports = config;
