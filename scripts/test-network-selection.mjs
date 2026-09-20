import assert from 'node:assert/strict'
import { selectLocalProxyIP } from '../src/shared/network.ts'

const localIPs = [
  { category: 'other', ip: '192.168.124.6', netmask: '255.255.255.0' },
  { category: 'other', ip: '192.168.64.1', netmask: '255.255.255.0' }
]

assert.equal(selectLocalProxyIP('192.168.64.3', localIPs), '192.168.64.1')
assert.equal(selectLocalProxyIP('192.168.124.3', localIPs), '192.168.124.6')
assert.equal(selectLocalProxyIP('172.16.0.3', localIPs), '')

console.log('Network-aware proxy IP selection passed')
