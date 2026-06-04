import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'PermissionManagement.vue'), 'utf8');

assert.match(
  source,
  /onMounted\(\(\)\s*=>\s*\{[\s\S]*refreshSessionDebug\(\)/,
  'permission management should refresh current account details when the page mounts'
);

console.log('permission management session debug tests passed');
