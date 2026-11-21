import { dataCenters } from '../src/dataCenters'
import type { Edge, Graph, Node } from '../src/graph'

const prefixes = ['Aster', 'Boreal', 'Cinder', 'Delta', 'Ember', 'Fjord', 'Glacier', 'Helio', 'Iris', 'Juniper', 'Kepler', 'Lumen']
const services = ['Identity', 'Payments', 'Search', 'Telemetry', 'Messaging', 'Archive', 'Registry', 'Routing']
const sites = Object.values(dataCenters)
const demoAdmins = ['Alex Martin', 'Noor Morgan', 'Sam Rivera', 'Casey Laurent', 'Jamie Chen', 'Avery Singh']
const processors = ['AMD EPYC 9354', 'AMD EPYC 9454', 'Intel Xeon Gold 6548Y+']

export function generateFleet(seed: number, appCount: number): Graph {
  let state = seed >>> 0
  const generatedAt = Date.now()
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0
    return state / 4294967296
  }
  const integer = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))
  const pick = <T>(items: readonly T[]) => items[integer(0, items.length - 1)]
  const nodes: Graph['nodes'] = {}
  const edges: Edge[] = []
  const roots: string[] = []

  function add(parent: Node | undefined, node: Node) {
    nodes[node.id] = node
    if (parent) (parent.children ??= []).push({ nodeId: node.id })
    return node
  }

  function metrics(usage: number, watts: number, intensity: number) {
    return {
      usage,
      powerConsumption: watts,
      carbonFootprint: Math.round(watts * intensity * 10) / 10
    }
  }

  function link(source: Node, target: Node, protocol: string, min = 12, max = 98) {
    edges.push({ source: source.id, target: target.id, protocol, weight: integer(min, max) / 100 })
  }

  const pad = (index: number) => String(index + 1).padStart(2, '0')
  const names = prefixes.flatMap(prefix => services.map(service => ({ prefix, service })))
  for (let index = names.length - 1; index > 0; index--) {
    const other = integer(0, index)
    const item = names[index]
    names[index] = names[other]
    names[other] = item
  }

  for (let index = 0; index < appCount; index++) {
    const id = 'app-' + pad(index)
    const { prefix, service } = names[index % names.length]
    const primary = pick(sites)
    const intensity = integer(9, 58) / 100
    const hostCount = integer(8, 15)
    const app = add(undefined, {
      id, type: 'application', name: prefix + ' ' + service + (index >= names.length ? ' ' + pad(index) : ''),
      updatedAt: new Date(generatedAt - integer(1, 365 * 24) * 3_600_000).toISOString(),
      description: '3 data centers' + ' · ' + hostCount + ' hosts',
      security: {
        admins: [demoAdmins[index % demoAdmins.length], demoAdmins[(index + 2) % demoAdmins.length]],
        owner: prefix + ' Engineering',
        supportGroup: service + ' Operations',
        securityGroup: 'Platform Security',
        lastAccessReview: new Date(generatedAt - (14 + index % 90) * 86_400_000).toISOString()
      },
      specs: { 'Primary region': primary.region, Environment: pick(['Production', 'Production', 'Staging']), 'Grid intensity': Math.round(intensity * 1000) + ' gCO₂e/kWh' }
    })
    roots.push(app.id)
    const hasLegacyAssets = integer(1, 100) <= 62
    const hasOpenFindings = integer(1, 100) <= 57

    const ttl = integer(1, 120)
    const tls = add(app, {
      id: id + '-tls', name: 'Edge TLS', type: 'certificate',
      health: ttl < 7 ? 'Watch' : 'Healthy', description: 'Certificate for the public endpoint',
      healthReason: ttl < 7 ? `The certificate expires in ${ttl} ${ttl === 1 ? 'day' : 'days'}. The warning threshold is 7 days.` : undefined,
      specs: { Renewal: 'Due in ' + ttl + ' days', Issuer: 'Demo Trust CA' }
    })
    const dns = add(app, {
      id: id + '-dns', name: 'Public DNS', type: 'dns', health: 'Healthy',
      specs: { Type: 'CNAME', Target: id + '.example.net', TTL: pick(['60 s', '120 s', '300 s']) }
    })
    const balancer = add(app, {
      id: id + '-lb', name: 'Load Balancer', type: 'load-balancer', health: 'Healthy',
      metrics: metrics(integer(12, 78), integer(30, 80), intensity),
      specs: { Policy: 'Least connections', Backends: String(hostCount) }
    })
    link(dns, balancer, 'DNS')
    link(tls, balancer, 'TLS')
    link(app, balancer, 'HTTPS')

    const databases = Array.from({ length: integer(2, 4) }, (_, dbIndex) => {
      const usage = integer(25, 97)
      const rolloutPending = hasOpenFindings && integer(1, 100) <= 22
      return add(app, {
        id: id + '-db-' + pad(dbIndex), name: 'Data Shard ' + pad(dbIndex), type: 'database',
        health: usage > 90 ? 'Watch' : 'Healthy',
        healthReason: usage > 90 ? `Database usage is ${usage}%. The warning threshold is 90%.` : undefined,
        maintenance: rolloutPending ? {
          vulnerabilities: [{
            id: 'DEMO-DB-01', severity: 'Critical', summary: 'Missing database security update',
            remediation: 'Roll out the approved patched database release.'
          }]
        } : undefined,
        metrics: metrics(usage, integer(155, 520), intensity),
        specs: { Engine: pick(['PostgreSQL 16', 'PostgreSQL 17']), Replicas: String(integer(2, 4)) }
      })
    })

    for (let host = 0; host < hostCount; host++) {
      const site = sites[(sites.indexOf(primary) + host) % sites.length]
      const hostId = id + '-host-' + pad(host)
      const load = integer(22, 98)
      const obsoleteImage = hasLegacyAssets && integer(1, 100) <= 20
      const patchOverdue = hasOpenFindings && integer(1, 100) <= 16
      const server = add(app, {
        id: hostId, name: 'Compute ' + pad(host), type: 'server', locationId: site.id,
        health: load > 93 ? 'Critical' : load > 84 ? 'Watch' : 'Healthy',
        healthReason: load > 84 ? `Host load is ${load}%. The ${load > 93 ? 'critical threshold is 93%' : 'warning threshold is 84%'}.` : undefined,
        maintenance: obsoleteImage || patchOverdue ? {
          obsolete: obsoleteImage ? { reason: 'The host image is out of support.', upgradeTo: 'Supported LTS host image' } : undefined,
          vulnerabilities: patchOverdue ? [{
            id: 'DEMO-HOST-01', severity: 'High', summary: 'Host security update overdue',
            remediation: 'Apply the approved operating system security updates.'
          }] : undefined
        } : undefined,
        specs: { Chassis: pick(['1U rackmount', '2U rackmount']), Zone: site.region + pick(['a', 'b', 'c']) }
      })
      link(balancer, server, 'HTTPS', 30)
      link(server, databases[host % databases.length], 'PostgreSQL', 25)
      const cpu = add(server, {
        id: hostId + '-cpu', name: 'CPU 01', type: 'cpu',
        health: load > 93 ? 'Critical' : 'Healthy',
        healthReason: load > 93 ? `CPU usage is ${load}%. The critical threshold is 93%.` : undefined,
        metrics: metrics(load, integer(90, 325), intensity),
        specs: { Model: pick(processors), Cores: pick(['24', '32', '48', '64']) }
      })
      link(server, cpu, 'Socket')
      const bankCount = integer(2, 4)
      for (let bank = 0; bank < bankCount; bank++) {
        const ram = add(server, {
          id: hostId + '-ram-' + pad(bank), name: 'Memory Bank ' + pad(bank),
          type: 'memory', health: 'Healthy',
          metrics: metrics(integer(35, 94), integer(15, 42), intensity),
          specs: { Capacity: pick(['64 GiB', '128 GiB', '256 GiB']), Type: 'DDR5 ECC' }
        })
        link(cpu, ram, 'DDR5')
      }
      const driveCount = integer(2, 5)
      for (let bay = 0; bay < driveCount; bay++) {
        const nvme = bay < 2
        const usage = integer(15, 97)
        const drive = add(server, {
          id: hostId + '-drive-' + pad(bay), name: 'Drive ' + pad(bay), type: 'drive',
          health: usage > 92 ? 'Watch' : 'Healthy',
          healthReason: usage > 92 ? `Drive usage is ${usage}%. The warning threshold is 92%.` : undefined,
          metrics: metrics(usage, integer(7, 28), intensity),
          specs: { Capacity: pick(nvme ? ['1.92 TB', '3.84 TB', '7.68 TB'] : ['8 TB', '12 TB', '16 TB']), Interface: nvme ? 'NVMe' : 'SAS' }
        })
        link(cpu, drive, nvme ? 'PCIe' : 'SAS')
        if (bay === 1) {
          const obsoleteFirmware = hasLegacyAssets && integer(1, 100) <= 12
          const controller = add(drive, {
            id: drive.id + '-controller', name: 'Storage Controller', type: 'cpu',
            health: 'Healthy', metrics: metrics(integer(12, 70), integer(2, 6), intensity),
            maintenance: obsoleteFirmware ? {
              obsolete: { reason: 'Controller firmware is out of support.', upgradeTo: 'Current supported controller firmware' }
            } : undefined,
            specs: { Firmware: '3.' + integer(1, 9) + '.' + integer(0, 12) }
          })
          link(drive, controller, 'NVMe')
        }
      }
    }
  }

  return { roots, nodes, edges, locations: dataCenters }
}
