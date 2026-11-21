import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import type { OverviewMeasure } from './applicationCriteria'
import type { GetAttention } from './attention'
import type { Graph, Lens } from './graph'
import type { Registry } from './registry'
import type { CameraCommand, createStage } from './stage'

interface Props {
  graph: Graph
  path: string[]
  locationId: string
  overviewMeasure?: OverviewMeasure
  getAttention: GetAttention
  lens: Lens
  values: Map<string, number>
  registry: Registry
  onOpen(id: string): void
  onSite(id: string): void
  onHover(id: string | null): void
  camera: { action: CameraCommand, sequence: number } | null
}

export function SceneViewport({ graph, path, locationId, overviewMeasure, getAttention, lens, values, registry, onOpen, onSite, onHover, camera }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<ReturnType<typeof createStage> | null>(null)
  const open = useRef(onOpen)
  const selectSite = useRef(onSite)
  const hover = useRef(onHover)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => { open.current = onOpen }, [onOpen])
  useEffect(() => { selectSite.current = onSite }, [onSite])
  useEffect(() => { hover.current = onHover }, [onHover])

  useEffect(() => {
    const element = host.current
    if (!element) return
    let current: ReturnType<typeof createStage> | undefined
    let canceled = false
    import('./stage').then(({ createStage }) => {
      if (canceled) return
      current = createStage(element, id => open.current(id), () => {
        current?.dispose()
        current = undefined
        setStage(null)
        setFailed(true)
        hover.current(null)
      }, id => selectSite.current(id), id => hover.current(id))
      setStage(current)
    }).catch(() => {
      if (canceled) return
      element.replaceChildren()
      setFailed(true)
    })
    return () => {
      canceled = true
      current?.dispose()
    }
  }, [attempt])

  useEffect(() => {
    stage?.show(graph, path, registry, locationId)
  }, [stage, graph, path, registry, locationId])

  useEffect(() => {
    stage?.setLens(lens, values, overviewMeasure)
    stage?.setAttention(getAttention)
  }, [stage, lens, values, graph, path, registry, locationId, overviewMeasure, getAttention])

  useEffect(() => {
    if (camera) stage?.command(camera.action)
  }, [stage, camera])

  return <>
    <div className="stage" ref={host} />
    {failed && <div className="stage-note" role="status">
      <span>3D view unavailable. Use the asset list to explore.</span>
      <button onClick={() => {
        setFailed(false)
        setAttempt(value => value + 1)
      }}>Retry 3D</button>
    </div>}
  </>
}

export class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed
      ? <div className="stage-note" role="status">3D view unavailable. Use the asset list to explore.</div>
      : this.props.children
  }
}
