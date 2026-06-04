import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(__dirname, 'Approval.vue'), 'utf8')

assert.match(source, /import Pagination from ['"]\.\.\/components\/Pagination\.vue['"]/, 'approval center should reuse shared Pagination component')
assert.match(source, /<Pagination[\s\S]*v-model:current-page="currentPage"[\s\S]*v-model:page-size="pageSize"[\s\S]*@change="handlePageChange"/, 'approval center should bind shared pagination state and change handler')
assert.match(source, /requirementApi\.getApprovalList\(page,\s*pageSize\.value,\s*filters\)/, 'approval center should request the selected page and page size from the server')
assert.match(source, /total\.value\s*=\s*res\.data\.total\s*\|\|\s*0/, 'approval center should store the backend total for pagination')
assert.match(source, /const applySearch = \(\) => \{[\s\S]*currentPage\.value = 1[\s\S]*loadRequirements\(1\)/, 'approval search should reset to the first page')
assert.doesNotMatch(source, /\.approval-list-region\s*\{[\s\S]*min-height:\s*4\d\dpx/, 'approval list region should not create a large empty gap above pagination')
assert.match(source, /\.approval\s+:deep\(\.tech-approval-card\)\s*\{[\s\S]*min-height:/, 'approval cards should keep a stable card height')

console.log('approval pagination view tests passed')
