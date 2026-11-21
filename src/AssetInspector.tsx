import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ApplicationSecurity } from './ApplicationSecurity'
import { AssetAttention } from './AssetAttention'
import { attentionLabel, type GetAttention } from './attention'
import { formatUpdateDate } from './applicationCriteria'
import type { DisplaySettings } from './displaySettings'
import type { Graph, Lens, Node } from './graph'
import { genericType, type Registry } from './registry'

export function formatMetric(value: number | undefined, lens: Lens) {
  if (value === undefined) return 'Unavailable'
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value) + (lens.unit === '%' ? '%' : ' ' + lens.unit)
}

interface Props {
  graph: Graph
  nodes: Node[]
  focus?: Node
  preview?: Node
  getAttention: GetAttention
  displaySettings: DisplaySettings
  registry: Registry
  lens: Lens
  values: Map<string, number>
  onOpen(id: string): void
  onClose(): void
}

export function AssetInspector({ graph, nodes, focus, preview, getAttention, displaySettings, registry, lens, values, onOpen, onClose }: Props) {
  const [ranked, setRanked] = useState(false)
  const [securityFor, setSecurityFor] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const panel = useRef<HTMLElement>(null)
  const savedScroll = useRef<number | undefined>(undefined)
  const canShowSecurity = Boolean(displaySettings.security && focus && (focus.type === 'application' || graph.roots.includes(focus.id)))
  const showSecurity = canShowSecurity && securityFor === focus?.id
  const previewId = showSecurity ? undefined : preview?.id
  const focusId = focus?.id
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [focusId])
  useLayoutEffect(() => {
    const element = panel.current
    if (!element) return
    if (previewId) {
      savedScroll.current ??= element.scrollTop
      element.scrollTop = 0
    } else if (savedScroll.current !== undefined) {
      element.scrollTop = savedScroll.current
      savedScroll.current = undefined
    }
  }, [previewId])
  const visible = nodes.filter(node => node.id !== focus?.id)
  if (ranked) visible.sort((a, b) => (values.get(b.id) ?? -Infinity) - (values.get(a.id) ?? -Infinity))
  const asset = showSecurity ? focus : preview ?? focus
  const type = asset ? registry.types.get(asset.type) ?? genericType : undefined
  const site = asset?.locationId ? graph.locations?.[asset.locationId] : undefined
  const relationships = asset ? graph.edges.filter(edge => edge.source === asset.id || edge.target === asset.id) : []

  return <aside className="inspector glass" aria-label="Asset inspector" ref={panel}>
    <div className="panel-head">
      <span className="eyebrow">{type?.label ?? 'Inventory'}{preview && !showSecurity ? ' · Preview' : ''}</span>
      <button className="icon-button" onClick={onClose} aria-label="Close inspector">×</button>
    </div>
    <h2 ref={heading} tabIndex={-1}>{asset?.name ?? 'Applications'}</h2>
    {canShowSecurity && <div className="inspector-views" role="group" aria-label="Application views">
      <button type="button" aria-pressed={!showSecurity} onClick={() => setSecurityFor(null)}>Details</button>
      <button type="button" aria-pressed={showSecurity} onClick={() => setSecurityFor(focus?.id ?? null)}>Security</button>
    </div>}
    {showSecurity ? <ApplicationSecurity security={focus?.security} /> : <>
      {asset && <>
        {asset.description && <p>{asset.description}</p>}
        <div className="metric">
          <span>{lens.label}</span>
          <strong>{formatMetric(values.get(asset.id), lens)}</strong>
        </div>
        {asset.health && <div className="health-status">
          <div className="health" data-health={asset.health}><i aria-hidden="true" />{asset.health}</div>
          {asset.healthReason && <p>{asset.healthReason}</p>}
          {!asset.healthReason && asset.health !== 'Healthy' && <p>Reason unavailable.</p>}
        </div>}
        <AssetAttention summary={getAttention(asset.id)} maintenance={asset.maintenance} displaySettings={displaySettings} />
        {(site || asset.specs || asset.updatedAt) && <dl>
          {asset.updatedAt && <div><dt>Last updated</dt><dd>{formatUpdateDate(Date.parse(asset.updatedAt))}</dd></div>}
          {site && <div><dt>Data center</dt><dd>{[site.name, site.code].filter(Boolean).join(' · ')}</dd></div>}
          {Object.entries(asset.specs ?? {}).map(([label, value]) =>
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          )}
        </dl>}
      </>}
      {!preview && visible.length > 0 && <>
        <div className="list-head">
          <h3>{focus ? 'Contained assets' : 'Applications'}</h3>
          <button aria-pressed={ranked} onClick={() => setRanked(value => !value)}>Rank by lens</button>
        </div>
        <ul className="asset-list">
          {visible.map(node => {
            const nodeType = registry.types.get(node.type) ?? genericType
            const nodeSite = node.locationId ? graph.locations?.[node.locationId] : undefined
            const summary = getAttention(node.id)
            const attention = attentionLabel(summary)
            const slot = focus?.children?.find(child => child.nodeId === node.id)
            return <li key={node.id}><button onClick={() => onOpen(node.id)}>
              <span className="asset-icon" aria-hidden="true">{nodeType.icon}</span>
              <span>
                <strong>{slot?.label ?? node.name}</strong>
                <small>{[nodeType.label, nodeSite?.name, node.health].filter(Boolean).join(' · ')}</small>
                {attention && <small className="attention-label" data-vulnerable={Boolean(summary.vulnerabilities)}>{attention}</small>}
              </span>
              <span className="asset-value">{formatMetric(values.get(node.id), lens)}</span>
            </button></li>
          })}
        </ul>
      </>}
      {relationships.length > 0 && <>
        <h3>Relationships</h3>
        <ul className="relations">{relationships.map((edge, index) => {
          const outbound = edge.source === asset?.id
          const peer = graph.nodes[outbound ? edge.target : edge.source]
          return <li key={index}><span>{peer?.name ?? (outbound ? edge.target : edge.source)}</span><small>{outbound ? 'Outbound' : 'Inbound'} · {edge.protocol}</small></li>
        })}</ul>
      </>}
    </>}
  </aside>
}
