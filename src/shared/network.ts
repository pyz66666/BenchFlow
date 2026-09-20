import type { LocalIP } from './types'

function ipv4ToNumber(ip: string): number | null {
  const octets = ip.split('.').map(Number)
  if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null
  return (((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3]) >>> 0
}

function sharesSubnet(localIP: LocalIP, host: string): boolean {
  const local = ipv4ToNumber(localIP.ip)
  const remote = ipv4ToNumber(host)
  const netmask = ipv4ToNumber(localIP.netmask)
  return local !== null && remote !== null && netmask !== null && (local & netmask) === (remote & netmask)
}

export function selectLocalProxyIP(host: string, localIPs: LocalIP[]): string {
  const sameSubnet = localIPs.find(localIP => sharesSubnet(localIP, host))
  if (sameSubnet) return sameSubnet.ip

  const category = host.startsWith('10.') ? '10' : host.startsWith('141.') ? '141' : host.startsWith('90.') ? '90' : ''
  return localIPs.find(localIP => localIP.category === category)?.ip || ''
}
