import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const apiSource = readFileSync(resolve(__dirname, '../api/index.js'), 'utf8');
assert.match(
  apiSource,
  /getAssignable:\s*\(\)\s*=>\s*api\.get\('\/developers\/assignable'/,
  'developerApi should expose an assignable-developer endpoint for requirement forms'
);

const formFiles = [
  resolve(__dirname, 'RequirementForm.vue'),
  resolve(__dirname, 'RequirementDialog.vue'),
  resolve(__dirname, '../views/Submit.vue')
];

for (const file of formFiles) {
  const source = readFileSync(file, 'utf8');
  assert.match(
    source,
    /developerApi\.getAssignable\(/,
    `${file} should load developers from the assignable-developer endpoint`
  );
}

console.log('developer assignment source tests passed');
