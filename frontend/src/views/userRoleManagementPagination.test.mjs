import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(__dirname, 'UserRoleManagement.vue'), 'utf8')
const apiSource = readFileSync(resolve(__dirname, '../api/index.js'), 'utf8')

assert.match(source, /import Pagination from ['"]\.\.\/components\/Pagination\.vue['"]/, 'user role management should reuse shared Pagination component')
assert.match(source, /<Pagination[\s\S]*v-model:current-page="currentPage"[\s\S]*v-model:page-size="pageSize"[\s\S]*@change="handlePageChange"/, 'user role management should bind shared pagination state and handler')
assert.match(source, /v-model="selectedRole"/, 'user role management should expose role filtering')
assert.match(source, /v-model\.trim="searchKeyword"/, 'user role management should expose keyword search')
assert.match(source, /function applyFilters\(\) \{[\s\S]*currentPage\.value = 1[\s\S]*loadUsers\(1\)/, 'filtering should reset to the first page')
assert.match(source, /userApi\.getAll\(\{[\s\S]*page,[\s\S]*pageSize: pageSize\.value,[\s\S]*role: selectedRole\.value,[\s\S]*keyword: searchKeyword\.value/, 'user role list should request page, page size, role, and keyword from the backend')
assert.match(source, /total\.value\s*=\s*res\.data\.total\s*\|\|\s*0/, 'user role list should store backend total for pagination')
assert.match(apiSource, /getAll:\s*\(params\s*=\s*\{\}\)\s*=>\s*api\.get\('\/users',\s*\{\s*params:/, 'userApi.getAll should accept query params')

console.log('user role management pagination tests passed')
