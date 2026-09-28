import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workspace = readFileSync('src/renderer/views/ServerWorkspace.vue', 'utf8')
const taskEditor = readFileSync('src/renderer/components/TaskEditDialog.vue', 'utf8')
const suiteEditor = readFileSync('src/renderer/views/TestSuitManager.vue', 'utf8')

assert.doesNotMatch(workspace, /proxy\.start\(8888\)/)
assert.match(taskEditor, /JSON\.parse\(content\)/)
assert.match(taskEditor, /collectSuiteSearchText/)
assert.match(taskEditor, /root\.testcase \|\| root\.taskcase \|\| root/)
assert.match(suiteEditor, /v-for="\(field, index\) in testcaseFields"/)
assert.match(suiteEditor, /JSON\.parse\(field\.jsonValue\)/)
assert.match(suiteEditor, /typeof field\.value === 'boolean'/)

console.log('Proxy, suite search, and generic testcase field checks passed')
