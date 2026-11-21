import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { ApplicationCarousel } from './ApplicationCarousel'
import { ApplicationRankingLegend } from './ApplicationRankingLegend'
import { updateScores, usesUpdateDate, type ApplicationCriterion, type OverviewMeasure } from './applicationCriteria'
import { createAttentionIndex } from './attention'
import { AssetInspector, formatMetric } from './AssetInspector'
import { DisplaySettingsDialog } from './DisplaySettingsDialog'
import { readDisplaySettings, saveDisplaySettings, type DisplaySettings } from './displaySettings'
import { DataCenterFilter } from './DataCenterFilter'
import { builtInLenses, openPath, rankApplications, rollUp, scope, selectLens, type DataAdapter, type Graph, type Lens, type Node } from './graph'
import { defaultRegistry, type Registry } from './registry'
import { sampleGraph } from './sample'
import { SceneBoundary, SceneViewport } from './SceneViewport'
import type { CameraCommand } from './stage'

const defaultOverviewAppLimit = 32

export interface VisualizerProps {
  overviewAppLimit?: number
  graph?: Graph
  dataAdapter?: DataAdapter
  registry?: Registry
  theme?: { title?: string, background?: string, accent?: string }
  onSelectNode?(node: Node): void
  onDrillDown?(node: Node, path: readonly string[]): void
  onLensChange?(lens: Lens): void
}

export function Visualizer({
  graph = sampleGraph, dataAdapter, registry = defaultRegistry, theme,
  overviewAppLimit = defaultOverviewAppLimit,
  onSelectNode, onDrillDown, onLensChange
}: VisualizerProps) {
  const snapshot = useCallback(() => dataAdapter?.getSnapshot() ?? graph, [graph, dataAdapter])
  const subscribe = useCallback((notify: () => void) => dataAdapter?.subscribe?.(notify) ?? (() => {}), [dataAdapter])
  const data = useSyncExternalStore(subscribe, snapshot, snapshot)
  const lenses = useMemo(() => [...registry.lenses.values()], [registry])
  const [lensId, setLensId] = useState('')
  const lens = lenses.find(entry => entry.id === lensId) ?? lenses[0] ?? builtInLenses[0]
  const values = useMemo(() => rollUp(data, lens), [data, lens])
  const [history, setHistory] = useState<string[]>([])
  const path = useMemo(() => {
    let valid: string[] = []
    for (const id of history) {
      const next = openPath(data, valid, id)
      if (next === valid) break
      valid = next
    }
    return valid
  }, [data, history])
  const appId = path[0]
  const [displaySettings, setDisplaySettings] = useState(readDisplaySettings)
  const [criterion, setCriterion] = useState<ApplicationCriterion>('highest')
  const [applicationQuery, setApplicationQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [siteFilter, setSiteFilter] = useState({ appId: '', locationId: '' })
  const locations = useMemo(() => {
    if (!appId || path.length !== 1 || !data.locations) return []
    const sites = data.locations
    const ids = new Set(data.nodes[appId].children?.map(slot => data.nodes[slot.nodeId]?.locationId))
    return Object.values(sites).filter(site => ids.has(site.id)).sort((a, b) => a.name.localeCompare(b.name))
  }, [appId, data, path.length])
  const locationId = siteFilter.appId === appId && locations.some(site => site.id === siteFilter.locationId)
    ? siteFilter.locationId
    : ''
  const chooseSite = useCallback((site: string) => {
    if (appId) {
      setHoveredId(null)
      setSiteFilter({ appId, locationId: site })
    }
  }, [appId])
  const view = useMemo(() => scope(data, path, locationId, applicationQuery), [data, path, locationId, applicationQuery])
  const limit = Number.isFinite(overviewAppLimit) && overviewAppLimit >= 1
    ? Math.floor(overviewAppLimit)
    : defaultOverviewAppLimit
  const attentionIndex = useMemo(() => createAttentionIndex(data), [data])
  const getAttention = useCallback((id: string) => {
    if (!displaySettings.obsolete && !displaySettings.vulnerabilities) return { obsolete: 0, vulnerabilities: 0 }
    const summary = attentionIndex(id)
    return {
      obsolete: displaySettings.obsolete ? summary.obsolete : 0,
      vulnerabilities: displaySettings.vulnerabilities ? summary.vulnerabilities : 0,
      highestSeverity: displaySettings.vulnerabilities ? summary.highestSeverity : undefined
    }
  }, [attentionIndex, displaySettings.obsolete, displaySettings.vulnerabilities])
  const updateSettings = useCallback((settings: DisplaySettings) => {
    setDisplaySettings(settings)
    saveDisplaySettings(settings)
    setCriterion(current => (
      (current === 'obsolete' && !settings.obsolete) ||
      (current === 'vulnerabilities' && !settings.vulnerabilities)
    ) ? 'highest' : current)
  }, [])
  const overviewMeasure = useMemo<OverviewMeasure | undefined>(() => {
    if (path.length) return
    if (usesUpdateDate(criterion)) {
      return { label: 'Last updated', kind: 'date', scores: updateScores(view.ids, data.nodes) }
    }
    if (criterion === 'obsolete' || criterion === 'vulnerabilities') {
      const label = criterion === 'obsolete' ? 'Obsolete assets' : 'Open vulnerabilities'
      return { label, kind: 'count', scores: new Map(view.ids.map(id => [id, getAttention(id)[criterion]])) }
    }
  }, [criterion, path.length, view.ids, data.nodes, getAttention])
  const overview = useMemo(() => {
    if (path.length) return
    const scores = overviewMeasure?.scores ?? values
    const ordered = rankApplications(view.ids, scores)
    const ascending = criterion === 'lowest' || criterion === 'oldest'
    const firstMeasured = ordered.findIndex(id => scores.has(id))
    const end = ascending && firstMeasured >= 0 ? Math.min(firstMeasured + limit, ordered.length) : ordered.length
    const ids = ordered.slice(Math.max(0, end - limit), end)
    const nodes = Object.fromEntries(ids.map(id => [id, data.nodes[id]]))
    const graph: Graph = {
      roots: ids,
      nodes,
      edges: view.edges.filter(edge => nodes[edge.source] && nodes[edge.target])
    }
    const low = ids.find(id => scores.has(id))
    const high = low === undefined ? undefined : ids.at(-1)
    const minimum = low === undefined ? undefined : scores.get(low)
    const maximum = high === undefined ? undefined : scores.get(high)
    return { graph, high, minimum, maximum }
  }, [path.length, view.ids, view.edges, values, overviewMeasure, criterion, limit, data.nodes])
  const shownGraph = overview?.graph ?? data
  const visibleIds = overview?.graph.roots ?? view.ids
  const nodes = visibleIds.map(id => data.nodes[id])
  const linkCount = overview?.graph.edges.length ?? view.edges.length
  const preview = nodes.find(node => node.id === hoveredId && node.id !== view.focus?.id)
  const [inspector, setInspector] = useState(false)
  const [camera, setCamera] = useState<{ action: CameraCommand, sequence: number } | null>(null)
  const command = useCallback((action: CameraCommand) => {
    setCamera(previous => ({ action, sequence: (previous?.sequence ?? 0) + 1 }))
  }, [])

  const open = useCallback((id: string) => {
    const node = data.nodes[id]
    if (!node || !visibleIds.includes(id)) return
    onSelectNode?.(node)
    setHoveredId(null)
    setInspector(true)
    const next = openPath(data, path, id)
    if (next === path) {
      command('focus')
      return
    }
    setHistory(next)
    if (node.children?.length) onDrillDown?.(node, next)
  }, [data, path, visibleIds, command, onSelectNode, onDrillDown])

  const navigate = useCallback((depth: number) => {
    setHoveredId(null)
    setHistory(path.slice(0, depth))
    setInspector(depth > 0)
  }, [path])

  const search = useCallback((query: string) => {
    setApplicationQuery(query)
    setHoveredId(null)
  }, [])

  const changeLens = useCallback((next: Lens) => {
    if (next.id === lens.id) return
    setLensId(next.id)
    setHoveredId(null)
    onLensChange?.(next)
  }, [lens, onLensChange])

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat ||
        (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable], dialog[open]'))) return
      if (event.key === 'Escape') {
        if (path.length) navigate(path.length - 1)
        else setInspector(false)
      } else if (event.key.toLowerCase() === 'r') command('reset')
      else changeLens(selectLens(lenses, lens, event.key))
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  }, [path, navigate, command, changeLens, lens, lenses])

  const colors = { '--surface': theme?.background, '--accent': theme?.accent } as CSSProperties
  return <main className="atlas" data-inspector-open={inspector} style={colors}>
    <SceneBoundary>
      <SceneViewport graph={shownGraph} path={path} locationId={locationId} overviewMeasure={overviewMeasure} getAttention={getAttention} registry={registry} lens={lens} values={values} onOpen={open} onSite={chooseSite} onHover={setHoveredId} camera={camera} />
    </SceneBoundary>

    <header className="masthead">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">◈</span>
        <div><h1>{theme?.title ?? 'Stratum'}</h1><span>Infrastructure atlas</span></div>
      </div>
      <div className="lens glass" role="group" aria-label="Analytical lens">
        {(lenses.length ? lenses : [lens]).map((item, index) => <button key={item.id} aria-pressed={lens.id === item.id} onClick={() => changeLens(item)} title={index < 9 ? 'Shortcut ' + (index + 1) : undefined}>{item.label}</button>)}
      </div>
      <div className="atlas-actions">
        <button className="inventory-toggle glass" aria-expanded={inspector} onClick={() => setInspector(value => !value)}>Inspector</button>
        <DisplaySettingsDialog settings={displaySettings} onChange={updateSettings} />
      </div>
    </header>

    <div className="view-navigation">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <button onClick={() => navigate(0)} aria-current={!path.length ? 'page' : undefined}>All Applications</button>
        {path.map((id, index) => <span key={id}>
          <span className="crumb-divider" aria-hidden="true">/</span>
          <button aria-current={index === path.length - 1 ? 'page' : undefined} onClick={() => navigate(index + 1)}>{data.nodes[id].name}</button>
        </span>)}
      </nav>
      {appId && locations.length > 0 && <DataCenterFilter locations={locations} selected={locationId}
        onChange={chooseSite} />}
    </div>

    {inspector && <AssetInspector graph={data} nodes={nodes} focus={view.focus} preview={preview} getAttention={getAttention} displaySettings={displaySettings} registry={registry} lens={lens} values={values} onOpen={open} onClose={() => setInspector(false)} />}

    <div className="camera-controls glass" role="group" aria-label="Camera controls">
      <button className="icon-button" aria-label="Zoom in" title="Zoom in" onClick={() => command('in')}>+</button>
      <button className="icon-button" aria-label="Zoom out" title="Zoom out" onClick={() => command('out')}>−</button>
      <button className="icon-button" aria-label="Focus selected asset" title="Focus selected asset" disabled={!view.focus} onClick={() => command('focus')}>⊙</button>
      <button className="icon-button" aria-label="Reset camera" title="Reset camera (R)" onClick={() => command('reset')}>↺</button>
    </div>

    {overview?.high && overview.minimum !== undefined && overview.maximum !== undefined &&
      <ApplicationRankingLegend lens={lens} measure={overviewMeasure} minimum={overview.minimum} maximum={overview.maximum} highest={data.nodes[overview.high]} />}
    {overview && <ApplicationCarousel nodes={nodes} applicationCount={view.ids.length} lens={lens}
      values={values} measure={overviewMeasure} getAttention={getAttention} displaySettings={displaySettings} onOpen={open} query={applicationQuery} onQueryChange={search}
      criterion={criterion} onCriterionChange={next => {
        setCriterion(next)
        setHoveredId(null)
      }} />}
    <footer>
      <span>{nodes.length.toLocaleString()} {path.length ? 'assets' : 'applications'} <b>·</b> {linkCount} links</span>
      <span className="gestures">Drag to orbit <b>·</b> Right drag to pan <b>·</b> Scroll to zoom</span>
      <span>{lens.label}{view.focus ? ' · ' + formatMetric(values.get(view.focus.id), lens) : ''}</span>
    </footer>
    <div className="sr-only" role="status">{view.focus?.name ?? 'Application overview'}. {path.length ? nodes.length + ' visible assets' : nodes.length + ' of ' + view.ids.length + ' applications'}. {lens.label} lens.</div>
  </main>
}
