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
  const requiredLabels = [
    '需求标题',
    '提交人',
    '选择开发人员',
    '对应平台',
    '能力',
    '期望日期',
    '开发前平均用时/次（小时）',
    '平均预估每月调用量/次',
    '开发后预计平均用时/次（小时）',
    '优先级'
  ];

  for (const label of requiredLabels) {
    assert.match(
      source,
      new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?<span class="required"\\s*>\\*</span>`),
      `${file} should mark ${label} as required`
    );
  }

  assert.match(source, /开发后预计平均用时\/次（小时）/, `${file} should show post-development average time in hours`);
  assert.match(source, /v-model="(?:form|editForm)\.postDevAvgTime"/, `${file} should bind postDevAvgTime`);
  assert.match(source, /优先级/, `${file} should show priority`);
  assert.match(source, /v-model="(?:form|editForm)\.priority"/, `${file} should bind priority`);
  assert.match(source, /placeholder="例：0\.8"/, `${file} should use hour-based examples for development time`);
  assert.match(source, /v-model="(?:form|editForm)\.avgDevTime"[\s\S]*?type="text"[\s\S]*?step="0\.1"[\s\S]*?inputmode="decimal"[\s\S]*?@beforeinput="allowDecimalNumberInput"/, `${file} should restrict pre-development time to decimal numbers`);
  assert.match(source, /v-model="(?:form|editForm)\.postDevAvgTime"[\s\S]*?type="text"[\s\S]*?step="0\.1"[\s\S]*?inputmode="decimal"[\s\S]*?@beforeinput="allowDecimalNumberInput"/, `${file} should restrict post-development time to decimal numbers`);
  assert.match(source, /v-model="(?:form|editForm)\.avgMonthlyCalls"[\s\S]*?type="number"[\s\S]*?step="1"[\s\S]*?@beforeinput="allowIntegerNumberInput"/, `${file} should restrict monthly calls to numbers`);
  assert.doesNotMatch(source, /发送人邮箱/, `${file} should not show sender email`);
  assert.doesNotMatch(source, /抄送邮箱/, `${file} should not show cc email`);
}
