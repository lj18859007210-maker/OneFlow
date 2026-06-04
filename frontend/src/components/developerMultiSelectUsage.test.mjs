import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const formFiles = [
  resolve(__dirname, 'RequirementForm.vue'),
  resolve(__dirname, 'RequirementDialog.vue'),
  resolve(__dirname, '../views/Submit.vue')
];

for (const file of formFiles) {
  const source = readFileSync(file, 'utf8');
  assert.match(source, /DeveloperMultiSelect/, `${file} should use DeveloperMultiSelect`);
  assert.doesNotMatch(source, /<select[^>]+v-model="(?:form|editForm)\.developer"/, `${file} should not use the native developer multi-select`);
}

const componentSource = readFileSync(resolve(__dirname, 'DeveloperMultiSelect.vue'), 'utf8');
assert.match(componentSource, /defineProps/, 'DeveloperMultiSelect should be a Vue component');
assert.match(componentSource, /update:modelValue/, 'DeveloperMultiSelect should support v-model');
