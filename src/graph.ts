import type { Maintenance } from './attention'

export interface Node {
  id: string
  type: string
  name: string
  description?: string
  locationId?: string
  updatedAt?: string
  maintenance?: Maintenance
  security?: ApplicationSecurityInfo
  health?: 'Healthy' | 'Watch' | 'Critical'
  healthReason?: string
  metrics?: Record<string, number>
  specs?: Record<string, string>
  children?: DetailSlot[]
}

export interface ApplicationSecurityInfo {
  admins: string[]
  owner?: string
  supportGroup?: string
  securityGroup?: string
  lastAccessReview?: string
}

export interface DetailSlot {
  nodeId: string
  label?: string
}

export interface Edge {
  source: string
  target: string
  protocol: string
  weight: number
}

export interface DataCenter {
  id: string
  name: string
  code?: string
  region?: string
}

export interface Graph {
  locations?: Record<string, DataCenter>
  roots: string[]
  nodes: Record<string, Node>
  edges: Edge[]
}

export interface DataAdapter {
  getSnapshot(): Graph
  subscribe?(notify: () => void): () => void
}

export interface Lens {
  id: string
  label: string
  unit: string
  measure(node: Node): number | undefined
  aggregate(values: number[]): number
  encode(value: number): {
    color: string
    scale: number
    glow: number
    pulse: number
    thickness: number
  }
}

export function rollUp(graph: Graph, lens: Lens) {
  const values = new Map<string, number>()
  function visit(id: string, ancestors: Set<string>): number | undefined {
    if (ancestors.has(id)) return
    if (values.has(id)) return values.get(id)
    const node = graph.nodes[id]
    if (!node) return
    const measured = lens.measure(node)
    if (measured !== undefined && Number.isFinite(measured)) {
      values.set(id, measured)
      return measured
    }
    ancestors.add(id)
    const children = [...new Set(node.children?.map(slot => slot.nodeId))]
      .map(child => visit(child, ancestors))
      .filter((value): value is number => value !== undefined)
    ancestors.delete(id)
    const value = children.length ? lens.aggregate(children) : undefined
    if (value === undefined || !Number.isFinite(value)) return
    values.set(id, value)
    return value
  }
  for (const id of Object.keys(graph.nodes)) visit(id, new Set())
  return values
}

export function scope(graph: Graph, path: string[], locationId = '', applicationQuery = '') {
  const terms = path.length ? [] : applicationQuery.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  const focus = graph.nodes[path.at(-1) ?? '']
  const ids = [...new Set(focus ? [focus.id, ...(focus.children ?? []).map(slot => slot.nodeId)] : graph.roots)]
    .filter(id => {
      const node = graph.nodes[id]
      if (!node) return false
      if (terms.length && !terms.every(term => node.name.toLocaleLowerCase().includes(term))) return false
      if (!locationId || id === focus?.id) return true
      return node.locationId ? node.locationId === locationId : node.type !== 'server'
    })
  const visible = new Set(ids)
  return {
    focus,
    ids,
    edges: graph.edges.filter(edge => visible.has(edge.source) && visible.has(edge.target))
  }
}

export function openPath(graph: Graph, path: string[], id: string) {
  const { ids, focus } = scope(graph, path)
  if (!ids.includes(id) || path.includes(id) || focus?.id === id) return path
  return [...path, id]
}

export function selectLens(lenses: readonly Lens[], current: Lens, key: string) {
  return /^[1-9]$/.test(key) ? lenses[Number(key) - 1] ?? current : current
}

export function metricLens(id: string, label: string, unit: string, ceiling: number, colors: string[], average = false): Lens {
  return {
    id, label, unit,
    measure: node => node.metrics?.[id],
    aggregate: values => values.reduce((sum, value) => sum + value, 0) / (average ? values.length : 1),
    encode(value) {
      const ratio = Math.min(1, Math.max(0, value / ceiling))
      return {
        color: colors[Math.min(colors.length - 1, Math.floor(ratio * colors.length))],
        scale: .89 + ratio * .24,
        glow: .14 + ratio * .65,
        pulse: .1 + ratio * .5,
        thickness: .013 + ratio * .03
      }
    }
  }
}

export const builtInLenses = [
  metricLens('usage', 'Usage', '%', 100, ['#77cfff', '#61ebde', '#f8cf83', '#ff8c73'], true),
  metricLens('powerConsumption', 'Power Consumption', 'W', 380, ['#9fb7ff', '#a790ff', '#f7a4e4', '#ffd38c']),
  metricLens('carbonFootprint', 'Carbon Footprint', 'gCO₂e/h', 125, ['#8ce3f1', '#9ae4b4', '#f9e08c', '#ffa183'])
]

export const applicationRankingColors = ['#407de5', '#69d9d0', '#ffbe55'] as const

export function rankApplications(ids: string[], values: Map<string, number>) {
  const ordered = [...ids].sort((a, b) => {
    const first = values.get(a)
    const second = values.get(b)
    if (first === undefined) return second === undefined ? a.localeCompare(b) : -1
    if (second === undefined) return 1
    return first - second || a.localeCompare(b)
  })
  return ordered
}
