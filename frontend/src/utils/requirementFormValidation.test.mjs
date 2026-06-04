import assert from 'node:assert/strict';
import {
  validateRequirementForm,
  isDecimalNumberText,
  isIntegerNumberText,
  normalizeDeveloperNames
} from './requirementFormValidation.js';

const completeForm = {
  title: 'Ticket routing automation',
  submitter: 'Alice',
  developer: ['Dev A', 'Dev B'],
  platform: 'CRM',
  capability: 'support',
  expectedDate: '2026-06-30',
  avgDevTime: '0.8',
  postDevAvgTime: '0.2',
  avgMonthlyCalls: '500',
  priority: 'medium'
};

assert.equal(validateRequirementForm(completeForm), '');
assert.equal(validateRequirementForm({ ...completeForm, developer: 'Dev A, Dev B' }), '');
assert.deepEqual(normalizeDeveloperNames([' Dev A ', 'Dev B', 'Dev A', '']), ['Dev A', 'Dev B']);
assert.deepEqual(normalizeDeveloperNames('Dev A, Dev B;Dev C'), ['Dev A', 'Dev B', 'Dev C']);

assert.match(
  validateRequirementForm({ ...completeForm, developer: [] }),
  /选择开发人员/,
  'at least one developer should be required'
);

assert.match(
  validateRequirementForm({ ...completeForm, platform: '' }),
  /对应平台/,
  'platform should be required'
);

assert.match(
  validateRequirementForm({ ...completeForm, avgDevTime: '1day' }),
  /开发前后平均用时只能填写数字/,
  'development time should reject unit text'
);

assert.match(
  validateRequirementForm({ ...completeForm, postDevAvgTime: '1e3' }),
  /开发前后平均用时只能填写数字/,
  'development time should reject exponential notation'
);

assert.match(
  validateRequirementForm({ ...completeForm, avgMonthlyCalls: '12.5' }),
  /平均预估每月调用量只能填写数字/,
  'monthly calls should be whole-number text'
);

assert.equal(isDecimalNumberText('0.8'), true);
assert.equal(isDecimalNumberText('10'), true);
assert.equal(isDecimalNumberText('10.25'), true);
assert.equal(isDecimalNumberText('1day'), false);
assert.equal(isDecimalNumberText('1e3'), false);
assert.equal(isIntegerNumberText('500'), true);
assert.equal(isIntegerNumberText('500.5'), false);
