const { readFileSync } = require('node:fs')
const { join, resolve } = require('node:path')

const rootDir = resolve(__dirname, '..')
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
const installerScript = readFileSync(join(rootDir, 'build', 'installer.nsh'), 'utf8')
const indexSource = readFileSync(join(rootDir, 'src/main/index.ts'), 'utf8')

if (packageJson.build?.nsis?.include !== 'build/installer.nsh') {
  throw new Error('NSIS shutdown hook is not configured')
}
if (!installerScript.includes('!macro customCheckAppRunning')) {
  throw new Error('NSIS custom app-running hook is missing')
}
if (!installerScript.includes('taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"')) {
  throw new Error('NSIS hook must terminate the application process tree')
}
if (!indexSource.includes("app.on('before-quit'")) {
  throw new Error('Electron shutdown cleanup is missing')
}
if (!indexSource.includes('await tunnelManager.removeAll()')) {
  throw new Error('Tunnel cleanup is missing from Electron shutdown')
}
if (!indexSource.includes('proxyManager.stop()')) {
  throw new Error('Proxy cleanup is missing from Electron shutdown')
}

console.log('Installer shutdown checks passed')
