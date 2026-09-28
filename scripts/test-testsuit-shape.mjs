import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync('src/renderer/views/TestSuitManager.vue', 'utf8')

assert.match(source, /return data\.testcase \|\| data\.taskcase/)
assert.match(source, /return data\.remark \|\| ''/)
assert.match(source, /const data = \{ \.\.\.editingSuit\.value\.data, remark: editingSuit\.value\.data\.remark \|\| '', testcase \}/)
assert.match(source, /for \(const \[key, value\] of Object\.entries\(tc\)\)/)

console.log('Test suite testcase/remark compatibility checks passed')
