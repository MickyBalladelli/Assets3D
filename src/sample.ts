import { dataCenters } from './dataCenters'
import type { Edge, Graph, Node } from './graph'

const nodes: Record<string, Node> = {}
const edges: Edge[] = []
const roots: string[] = []

function add(id: string, type: string, name: string, description: string, usage?: number, power = 0, health: Node['health'] = 'Healthy', specs?: Node['specs']) {
  nodes[id] = {
    id, type, name, description, health, specs,
    metrics: usage === undefined ? undefined : { usage, powerConsumption: power, carbonFootprint: Math.round(power * .31 * 10) / 10 }
  }
  return id
}

function link(source: string, target: string, protocol: string, weight: number) {
  edges.push({ source, target, protocol, weight })
}

const applications = [
  { id: 'meridian', name: 'Meridian', description: 'Customer identity and access', region: 'eu-west-3', db: 'Identity Store', load: 89 },
  { id: 'relay', name: 'Relay', description: 'Event streaming and delivery', region: 'eu-central-1', db: 'Event Ledger', load: 68 },
  { id: 'harbor', name: 'Harbor', description: 'Artifact and package registry', region: 'us-east-1', db: 'Registry Index', load: 54 }
]

const sites = Object.values(dataCenters)
const sampleTime = Date.now()
const daysSinceUpdate = [3, 18, 7]
for (const [index, { id, name, description, region, db, load }] of applications.entries()) {
  const primary = sites[index]
  const backup = sites[(index + 1) % sites.length]
  const app = add(id, 'application', name, description, undefined, 0, id === 'meridian' ? 'Watch' : 'Healthy', { Region: region, Environment: 'Production' })
  nodes[app].updatedAt = new Date(sampleTime - daysSinceUpdate[index] * 86_400_000).toISOString()
  nodes[app].security = {
    admins: [['Alex Martin', 'Noor Morgan'], ['Sam Rivera'], ['Casey Laurent', 'Noor Morgan']][index],
    owner: name + ' Engineering',
    supportGroup: name + ' Operations',
    securityGroup: 'Platform Security',
    lastAccessReview: new Date(sampleTime - (daysSinceUpdate[index] + 30) * 86_400_000).toISOString()
  }
  roots.push(app)
  const srv = add(id + '-01', 'server', 'Compute 01', 'Primary application host', undefined, 0, load > 80 ? 'Watch' : 'Healthy', { Chassis: '2U rackmount', Region: region })
  const spare = add(id + '-02', 'server', 'Compute 02', 'Warm failover host', 27, 154, 'Healthy', { Chassis: '1U rackmount', Region: backup.region })
  nodes[srv].locationId = primary.id
  nodes[spare].locationId = backup.id
  const database = add(id + '-db', 'database', db, 'Replicated PostgreSQL cluster', load - 19, 204, 'Healthy', { Engine: 'PostgreSQL 16', Replicas: '3' })
  const tls = add(id + '-tls', 'certificate', 'Edge TLS', 'Public endpoint certificate', 10, 0, id === 'meridian' ? 'Watch' : 'Healthy', { Issuer: 'Example Trust CA', Renewal: id === 'meridian' ? 'Due in 5 days' : 'Due in 74 days' })
  const dns = add(id + '-dns', 'dns', 'Public DNS', 'Authoritative application record', load - 40, 0, 'Healthy', { Record: 'CNAME', Target: id + '.example.net', TTL: '300 seconds' })
  const cpu = add(srv + '-cpu', 'cpu', 'CPU 01', 'Primary processor', load + 6, 175, load > 80 ? 'Critical' : 'Healthy', { Model: 'AMD EPYC 9354', Cores: '32' })
  const ram = add(srv + '-ram', 'memory', 'Memory Bank', 'Registered ECC memory', load, 38, 'Healthy', { Capacity: '256 GiB', Speed: '4800 MT/s' })
  const nvme = add(srv + '-nvme', 'drive', 'Drive 01', 'NVMe application volume', load - 5, 16, 'Healthy', { Capacity: '3.84 TB', Interface: 'PCIe 4.0' })
  const hdd = add(srv + '-hdd', 'drive', 'Drive 02', 'Rotational archive volume', load - 10, 11, 'Healthy', { Capacity: '12 TB', Interface: 'SAS' })
  const controller = add(hdd + '-controller', 'cpu', 'Drive Controller', 'Storage control board', 34, 4, 'Healthy', { Firmware: '3.4.2' })
  if (load > 80) {
    nodes[srv].healthReason = `Host load is ${load}%. The warning threshold is 80%.`
    nodes[cpu].healthReason = `CPU usage is ${load + 6}%. The critical threshold is 86%.`
  }
  if (index === 0) {
    nodes[app].healthReason = 'The primary host is under high load and the edge certificate is due for renewal.'
    nodes[tls].healthReason = 'The edge certificate expires in 5 days.'
    nodes[srv].maintenance = {
      obsolete: { reason: 'The installed host image is out of support.', upgradeTo: 'Supported LTS host image' },
      vulnerabilities: [{
        id: 'DEMO-HOST-01', severity: 'High', summary: 'Host security update overdue',
        remediation: 'Deploy the approved patched image during the next maintenance window.'
      }]
    }
    nodes[controller].maintenance = {
      obsolete: { reason: 'Controller firmware is out of support.', upgradeTo: 'Current supported controller firmware' }
    }
  } else if (index === 1) {
    nodes[database].maintenance = {
      vulnerabilities: [{
        id: 'DEMO-DB-01', severity: 'Critical', summary: 'Missing database security update',
        remediation: 'Upgrade to the approved patched database release.'
      }]
    }
  }
  nodes[app].children = [srv, database, tls, dns, spare].map(nodeId => ({ nodeId }))
  nodes[srv].children = [cpu, ram, nvme, hdd].map(nodeId => ({ nodeId }))
  nodes[hdd].children = [{ nodeId: controller, label: 'Control board' }]
  link(dns, app, 'DNS', .34)
  link(tls, app, 'TLS', .56)
  link(app, srv, 'HTTPS', .96)
  link(app, spare, 'HTTPS', .31)
  link(srv, database, 'PostgreSQL', .81)
  link(spare, database, 'PostgreSQL', .38)
  link(srv, cpu, 'Socket', .8)
  link(cpu, ram, 'DDR5', .75)
  link(cpu, nvme, 'PCIe', .68)
  link(cpu, hdd, 'SAS', .48)
  link(hdd, controller, 'SAS', .4)
}

export const sampleGraph: Graph = { nodes, edges, roots, locations: dataCenters }
