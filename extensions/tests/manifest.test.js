import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(path.join(extensionsDir, 'manifest.json'), 'utf8'));
const developmentManifest = JSON.parse(
  readFileSync(path.join(extensionsDir, 'manifest.development.json'), 'utf8'),
);

describe('extension host permissions', () => {
  test('production manifest pins the API origin and omits localhost', () => {
    expect(manifest.host_permissions).toContain('https://futurestack-aeyn.onrender.com/*');
    expect(manifest.host_permissions).not.toContain('https://*.onrender.com/*');
    expect(manifest.host_permissions.join(' ')).not.toMatch(/localhost/);
  });

  test('development manifest holds local API and sync hosts', () => {
    expect(developmentManifest.host_permissions).toEqual([
      'http://localhost:3000/*',
      'http://localhost:3001/*',
    ]);
  });
});
