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
const installerScriptPath = join(rootDir, 'build', 'installer.nsh')
const installerScript = readFileSync(installerScriptPath, 'utf8')
if (packageJson.build?.appId !== 'com.benchflow.desktop') {
  throw new Error('Windows installer must use the migrated BenchFlow application id')
}

if (nsis.oneClick !== false || nsis.perMachine !== true || nsis.allowToChangeInstallationDirectory !== true) {
  throw new Error('Windows installer must be assisted, per-machine, and allow choosing a different installation directory')
}

if (nsis.runAfterFinish !== false) {
  throw new Error('Windows installer must not automatically restart the application after installation')
}

if (nsis.include !== 'build/installer.nsh') {
  throw new Error('Windows installer must include the custom process shutdown hook')
}

if (!/!macro\s+customCheckAppRunning/i.test(installerScript)) {
  throw new Error('Installer must override the default app-running check')
}

if (!/taskkill\s+\/F\s+\/T\s+\/IM\s+"\$\{APP_EXECUTABLE_FILENAME\}"/i.test(installerScript)) {
  throw new Error('Installer must terminate the BenchFlow process tree before copying files')
}

if (!/taskkill\s+\/F\s+\/T\s+\/IM\s+"DoInPXE\.exe"/i.test(installerScript)) {
  throw new Error('Installer must terminate the legacy DoInPXE process during migration')
}

const appAsar = join(rootDir, 'release', 'win-unpacked', 'resources', 'app.asar')
if (!existsSync(appAsar)) {
  throw new Error(`Windows package was not found: ${appAsar}`)
}

const builderDebug = join(rootDir, 'release', 'builder-debug.yml')
if (existsSync(builderDebug)) {
  const generatedScript = readFileSync(builderDebug, 'utf8')
  const checkIndex = generatedScript.indexOf('!insertmacro CHECK_APP_RUNNING')
  const uninstallIndex = generatedScript.indexOf('!insertmacro uninstallOldVersion')
  if (checkIndex < 0 || uninstallIndex < 0 || checkIndex > uninstallIndex) {
    throw new Error('Generated NSIS script must close running apps before invoking the old uninstaller')
  }
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
