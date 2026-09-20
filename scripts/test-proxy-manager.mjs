import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { ProxyManager } from '../src/main/proxy-manager.ts'

const occupiedServer = createServer()
occupiedServer.listen(0, '0.0.0.0')
await once(occupiedServer, 'listening')
const occupiedPort = occupiedServer.address().port

const proxy = new ProxyManager()
assert.equal(await proxy.start(occupiedPort), false)
assert.equal(proxy.isRunning(), false)

await new Promise(resolve => occupiedServer.close(resolve))
assert.equal(await proxy.start(occupiedPort), true)
assert.equal(proxy.isRunning(), true)
proxy.stop()

console.log('Proxy startup readiness checks passed')
