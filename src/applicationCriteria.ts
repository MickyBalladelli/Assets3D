import type { Node } from './graph'

export type ApplicationCriterion = 'highest' | 'lowest' | 'recent' | 'oldest' | 'obsolete' | 'vulnerabilities'

export interface OverviewMeasure {
  label: string
  kind: 'date' | 'count'
  scores: Map<string, number>
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function usesUpdateDate(criterion: ApplicationCriterion) {
  return criterion === 'recent' || criterion === 'oldest'
}

export function updateScores(ids: string[], nodes: Record<string, Node>) {
  const scores = new Map<string, number>()
  for (const id of ids) {
    const updatedAt = nodes[id]?.updatedAt
    if (!updatedAt) continue
    const time = Date.parse(updatedAt)
    if (Number.isFinite(time)) scores.set(id, time)
  }
  return scores
}

export function formatUpdateDate(timestamp: number | undefined) {
  return timestamp === undefined || !Number.isFinite(timestamp) ? 'No date' : dateFormatter.format(timestamp)
}

const countFormatter = new Intl.NumberFormat()

export function formatOverviewScore(measure: OverviewMeasure, value: number | undefined) {
  return measure.kind === 'date' ? formatUpdateDate(value) : value === undefined ? 'Unavailable' : countFormatter.format(value)
}
