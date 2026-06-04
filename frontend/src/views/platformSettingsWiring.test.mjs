import assert from 'assert'
import fs from 'fs'

const appSource = fs.readFileSync(new URL('../App.vue', import.meta.url), 'utf8')
const mainSource = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8')
const apiSource = fs.readFileSync(new URL('../api/index.js', import.meta.url), 'utf8')

assert.match(appSource, /platform:manage/, 'sidebar should require platform:manage')
assert.match(appSource, /to="\/platforms"/, 'sidebar should link to platform settings')
assert.match(appSource, />平台配置</, 'sidebar should display platform settings label')
assert.match(mainSource, /PlatformSettings/, 'router should import PlatformSettings')
assert.match(mainSource, /path: '\/platforms'[\s\S]*permission: 'platform:manage'/, 'router should guard platform settings')
assert.match(apiSource, /platformApi[\s\S]*getAll:\s*\(\)\s*=>\s*api\.get\('\/platforms'\)/, 'platform API should load options')
assert.match(apiSource, /updateAll:\s*\(platforms\)\s*=>\s*api\.put\('\/platforms'/, 'platform API should save options')

const requirementFormSource = fs.readFileSync(new URL('../components/RequirementForm.vue', import.meta.url), 'utf8')
const requirementDialogSource = fs.readFileSync(new URL('../components/RequirementDialog.vue', import.meta.url), 'utf8')
const submitSource = fs.readFileSync(new URL('./Submit.vue', import.meta.url), 'utf8')

for (const source of [requirementFormSource, requirementDialogSource, submitSource]) {
  assert.match(source, /<PlatformPicker/, 'requirement platform select should use collapsible platform picker')
  assert.match(source, /v-model="(?:form|editForm)\.platform"/, 'platform picker should bind requirement platform value')
}

const pickerSource = fs.readFileSync(new URL('../components/PlatformPicker.vue', import.meta.url), 'utf8')
const platformSettingsSource = fs.readFileSync(new URL('./PlatformSettings.vue', import.meta.url), 'utf8')

assert.match(pickerSource, /group-toggle/, 'platform picker should expose collapsible groups')
assert.match(pickerSource, /展开/, 'platform picker should show an explicit expand action')
assert.match(pickerSource, /收起/, 'platform picker should show an explicit collapse action')
assert.match(pickerSource, /getPlatformOptionValue\(group\.name\)/, 'first-level platform group should be selectable')
assert.match(pickerSource, /getPlatformOptionValue\(group\.name,\s*child\)/, 'second-level platform should include group context')
assert.match(platformSettingsSource, /collapse-btn/, 'platform settings groups should be collapsible')
assert.match(platformSettingsSource, /isExpanded\(groupIndex\)/, 'platform settings should conditionally render expanded group body')
assert.match(platformSettingsSource, /全部收起/, 'platform settings should support collapsing all groups')
assert.match(platformSettingsSource, /全部展开/, 'platform settings should support expanding all groups')
assert.match(platformSettingsSource, /function toPlatformText/, 'platform settings should sanitize object-shaped platform values before editing')
assert.match(platformSettingsSource, /platformDrafts\.value = clonePlatforms\(platformDrafts\.value\)/, 'platform settings should sanitize drafts before saving')

console.log('platform settings wiring tests passed')
