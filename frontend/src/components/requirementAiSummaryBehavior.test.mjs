import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const formFiles = [
  resolve(__dirname, 'RequirementForm.vue'),
  resolve(__dirname, 'RequirementDialog.vue'),
  resolve(__dirname, '../views/Submit.vue')
]

for (const file of formFiles) {
  const source = readFileSync(file, 'utf8')

  assert.match(
    source,
    /const summaryTitle = computed\(\(\) =>[\s\S]*summaryLoading\.value[\s\S]*需求描述预览（AI 正在结构化整理\.\.\.）[\s\S]*需求描述预览（已整理，可编辑）/,
    `${file} should switch the preview title after AI summary finishes`
  )

  assert.match(
    source,
    /<label class="tech-form-label">\s*\{\{\s*summaryTitle\s*\}\}\s*<\/label>/,
    `${file} should render the summary title from reactive state`
  )

  assert.doesNotMatch(
    source,
    /v-model="(?:form|editForm)\.description"[\s\S]{0,120}\breadonly\b/,
    `${file} should keep the AI summary textarea editable`
  )

  assert.match(
    source,
    /不得编造|不要编造/,
    `${file} should explicitly tell AI not to invent missing information`
  )

  assert.match(
    source,
    /未提及|用户未提供/,
    `${file} should tell AI how to mark information that the user did not provide`
  )
}

const myRequirementsSource = readFileSync(resolve(__dirname, '../views/MyRequirements.vue'), 'utf8')

assert.doesNotMatch(
  myRequirementsSource,
  /\.tech-modal-overlay\s*\{[\s\S]*backdrop-filter:/,
  'submit requirement modal overlay should avoid expensive backdrop blur'
)

console.log('requirement AI summary behavior tests passed')
