import type { Graph } from './graph'

export type VulnerabilitySeverity = 'Low' | 'Medium' | 'High' | 'Critical'

export interface Vulnerability {
  id: string
  severity: VulnerabilitySeverity
  summary: string
  remediation?: string
  status?: 'open' | 'resolved'
}

export interface Maintenance {
  obsolete?: { reason: string, upgradeTo?: string }
  vulnerabilities?: Vulnerability[]
}

export interface AttentionSummary {
  obsolete: number
  vulnerabilities: number
  highestSeverity?: VulnerabilitySeverity
}

const severityOrder: VulnerabilitySeverity[] = ['Low', 'Medium', 'High', 'Critical']

export function createAttentionIndex(graph: Graph) {
  const cache = new Map<string, AttentionSummary>()
  return (id: string): AttentionSummary => {
    const cached = cache.get(id)
    if (cached) return cached
    const summary: AttentionSummary = { obsolete: 0, vulnerabilities: 0 }
    const visited = new Set<string>()
    const pending = [id]
    while (pending.length) {
      const current = pending.pop()!
      if (visited.has(current)) continue
      visited.add(current)
      const node = graph.nodes[current]
      if (!node) continue
      if (node.maintenance?.obsolete) summary.obsolete++
      const findings = new Set<string>()
      for (const finding of node.maintenance?.vulnerabilities ?? []) {
        if (finding.status === 'resolved' || findings.has(finding.id)) continue
        findings.add(finding.id)
        summary.vulnerabilities++
        if (!summary.highestSeverity || severityOrder.indexOf(finding.severity) > severityOrder.indexOf(summary.highestSeverity)) {
          summary.highestSeverity = finding.severity
        }
      }
      for (const { nodeId } of node.children ?? []) pending.push(nodeId)
    }
    cache.set(id, summary)
    return summary
  }
}

export type GetAttention = ReturnType<typeof createAttentionIndex>

export function attentionLabel({ obsolete, vulnerabilities }: AttentionSummary) {
  return [
    obsolete && obsolete + ' obsolete',
    vulnerabilities && vulnerabilities + (vulnerabilities === 1 ? ' vulnerability' : ' vulnerabilities')
  ].filter(Boolean).join(' · ')
}
