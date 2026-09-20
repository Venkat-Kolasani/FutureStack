import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import developmentManifest from './manifest.development.json';

function resolveManifest() {
  const includeDevelopmentHosts = process.env.EXTENSION_DEV_HOSTS === '1';
  const host_permissions = includeDevelopmentHosts
    ? [...new Set([...manifest.host_permissions, ...developmentManifest.host_permissions])]
    : [...manifest.host_permissions];

  return {
    ...manifest,
    host_permissions,
  };
}

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest: resolveManifest() }),
  ],
});
