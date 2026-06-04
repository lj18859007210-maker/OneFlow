import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'DeveloperManagement.vue'), 'utf8');

assert.match(source, /developerApi\.getAssignable\(/, 'developer management should load assignable people');
assert.doesNotMatch(source, /developerApi\.getAll\(/, 'developer management should not use developer-only list');
assert.doesNotMatch(source, /developerApi\.getLoadStats\(/, 'load cards should come from the same assignable source');
assert.doesNotMatch(source, /developerApi\.getDepartments\(/, 'department filter should come from the same assignable source');
assert.match(source, /canManageDeveloperProfile/, 'admin rows should not expose developer profile actions');
assert.match(source, /dev\.role !== 'admin'/, 'admin rows should be protected from developer edit/delete actions');

console.log('developer management assignable tests passed');
