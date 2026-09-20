const { existsSync, readFileSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { execFileSync } = require('node:child_process')

const rootDir = resolve(__dirname, '..')
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
const excludedNativeModules = packageJson.build?.files?.includes('!**/*.node')
const windowsBuildCommand = packageJson.scripts?.['electron:build:win'] || ''

if (!excludedNativeModules) {
  throw new Error('Windows package must exclude every native .node module')
}

if (!/electron-builder\s+--win\s+--x64/.test(windowsBuildCommand)) {
  throw new Error('Windows build must explicitly target x64')
}

const nsis = packageJson.build?.nsis || {}
if (nsis.oneClick !== false || nsis.allowToChangeInstallationDirectory !== true) {
  throw new Error('Windows installer must allow choosing a different installation directory')
}

if (nsis.runAfterFinish !== false) {
  throw new Error('Windows installer must not automatically restart the application after installation')
}

const appAsar = join(rootDir, 'release', 'win-unpacked', 'resources', 'app.asar')
if (!existsSync(appAsar)) {
  throw new Error(`Windows package was not found: ${appAsar}`)
}

const installer = join(rootDir, 'release', `BenchFlow-Setup-${packageJson.version}-x64.exe`)
if (!existsSync(installer)) {
  throw new Error(`x64 Windows installer was not found: ${installer}`)
}

const executableHeader = readFileSync(join(rootDir, 'release', 'win-unpacked', 'BenchFlow.exe'))
const peOffset = executableHeader.readUInt32LE(0x3c)
const machine = executableHeader.readUInt16LE(peOffset + 4)
if (machine !== 0x8664) {
  throw new Error(`Windows application is not x64 (PE machine: 0x${machine.toString(16)})`)
}

const asarCli = require.resolve('@electron/asar/bin/asar.js')
const contents = execFileSync(process.execPath, [asarCli, 'list', appAsar], {
  cwd: rootDir,
  encoding: 'utf8'
})

const nativeModules = contents
  .split(/\r?\n/)
  .filter((entry) => entry.endsWith('.node'))

if (nativeModules.length > 0) {
  throw new Error(`Windows package contains native modules:\n${nativeModules.join('\n')}`)
}

console.log('Windows package check passed: x64 installer with no native .node modules')
