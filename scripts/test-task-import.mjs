import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync('src/renderer/views/TaskEditor.vue', 'utf8')

assert.ok(source.includes('>导入任务</el-button>'))
assert.ok(source.includes('const imported = Array.isArray(data)'))
assert.ok(source.includes('Array.isArray(data?.tasks)'))
assert.ok(source.includes('tasks.value.push(...imported)'))
assert.ok(source.includes('每个任务都必须包含 suite 字段'))
assert.ok(source.includes('return { suite: suite || suit, ...rest }'))

console.log('Single-task import checks passed')
