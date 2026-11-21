import type { Node } from './graph'

export const applicationBandTypeId = 'application-rank-band'
const overviewLimit = 48
const bandCount = 6
const featuredCount = 8

interface RankBand {
  node: Node
  start: number
  end: number
  minimum?: number
  maximum?: number
}

export function groupApplications(
  ordered: string[],
  values: Map<string, number>,
  trail: string[],
  nodeExists: (id: string) => boolean
) {
  function page(start: number, end: number, depth: number) {
    const bands = new Map<string, RankBand>()
    const ids: string[] = []
    const size = end - start
    const groupedEnd = size > overviewLimit ? end - (depth === 0 ? featuredCount : 0) : start
    if (groupedEnd > start) {
      const chunkSize = Math.ceil((groupedEnd - start) / bandCount)
      for (let from = start; from < groupedEnd; from += chunkSize) {
        const to = Math.min(from + chunkSize, groupedEnd)
        let id = 'rank-band:' + from + ':' + to
        while (nodeExists(id)) id += ':'
        let minimum: number | undefined
        let maximum: number | undefined
        for (let index = from; index < to; index++) {
          const value = values.get(ordered[index])
          if (value === undefined) continue
          minimum ??= value
          maximum = value
        }
        const name = 'Ranks ' + (ordered.length - to + 1) + '–' + (ordered.length - from)
        const node = { id, name, type: applicationBandTypeId }
        bands.set(id, { node, start: from, end: to, minimum, maximum })
        ids.push(id)
      }
    }
    ids.push(...ordered.slice(groupedEnd, end))
    return { bands, ids, start, end }
  }

  let current = page(0, ordered.length, 0)
  const breadcrumbs: Node[] = []
  for (const id of trail) {
    const band = current.bands.get(id)
    if (!band) break
    breadcrumbs.push(band.node)
    current = page(band.start, band.end, breadcrumbs.length)
  }

  return { ...current, breadcrumbs, appIds: ordered.slice(current.start, current.end) }
}
