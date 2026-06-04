import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = [
  resolve(__dirname, 'RequirementForm.vue'),
  resolve(__dirname, 'RequirementDialog.vue'),
  resolve(__dirname, '../views/Submit.vue')
];

for (const file of files) {
  const source = readFileSync(file, 'utf8');

  assert.match(source, /const summaryLoading = ref\(false\)/, `${file} should track AI summary generation separately`);
  assert.match(source, /summaryLoading\.value = true[\s\S]*?summaryLoading\.value = false/, `${file} should reset summary loading after finalSummary finishes`);
  assert.match(source, /:disabled="[^"]*summaryLoading[^"]*"/, `${file} should disable submit while AI summary is generating`);
}
