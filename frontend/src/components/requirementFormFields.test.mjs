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
  assert.match(source, /开发后预计平均用时\/次/, `${file} should show post-development average time`);
  assert.match(source, /v-model="(?:form|editForm)\.postDevAvgTime"/, `${file} should bind postDevAvgTime`);
  assert.match(source, /优先级/, `${file} should show priority`);
  assert.match(source, /v-model="(?:form|editForm)\.priority"/, `${file} should bind priority`);
  assert.doesNotMatch(source, /发送人邮箱/, `${file} should not show sender email`);
  assert.doesNotMatch(source, /抄送邮箱/, `${file} should not show cc email`);
}

