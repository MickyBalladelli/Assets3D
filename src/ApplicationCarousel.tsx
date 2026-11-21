import { useEffect } from 'react'
import { useCarouselDrag } from './useCarouselDrag'
import { formatOverviewScore, type ApplicationCriterion, type OverviewMeasure } from './applicationCriteria'
import { attentionLabel, type GetAttention } from './attention'
import { formatMetric } from './AssetInspector'
import type { DisplaySettings } from './displaySettings'
import type { Lens, Node } from './graph'

interface Props {
  nodes: Node[]
  applicationCount: number
  lens: Lens
  values: Map<string, number>
  measure?: OverviewMeasure
  getAttention: GetAttention
  displaySettings: DisplaySettings
  criterion: ApplicationCriterion
  onCriterionChange(criterion: ApplicationCriterion): void
  onOpen(id: string): void
  query: string
  onQueryChange(query: string): void
}

export function ApplicationCarousel({ nodes, applicationCount, lens, values, measure, getAttention, displaySettings, criterion, onCriterionChange, onOpen, query, onQueryChange }: Props) {
  const { strip, stopMotion, handlers } = useCarouselDrag()
  useEffect(() => { stopMotion() }, [lens, stopMotion])
  const scroll = (direction: number) => {
    if (!strip.current) return
    stopMotion()
    const width = strip.current.firstElementChild?.getBoundingClientRect().width ?? 200
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    strip.current.scrollBy({ left: (width + 8) * direction, behavior })
  }

  return <section className="carousel" aria-label="Application carousel">
    <div className="carousel-head">
      <h2>Applications <span>{nodes.length.toLocaleString()}{nodes.length < applicationCount ? ' of ' + applicationCount.toLocaleString() : ''}</span></h2>
      <input className="app-search glass" type="search" aria-label="Search applications" placeholder="Search apps"
        value={query} onChange={event => {
          stopMotion()
          strip.current?.scrollTo({ left: 0, behavior: 'instant' })
          onQueryChange(event.target.value)
        }} />
      <select className="app-criteria glass" aria-label="Application criteria" value={criterion} onChange={event => {
        stopMotion()
        strip.current?.scrollTo({ left: 0, behavior: 'instant' })
        onCriterionChange(event.target.value as ApplicationCriterion)
      }}>
        <option value="highest">Top {lens.label}</option>
        <option value="lowest">Least {lens.label}</option>
        <option value="recent">Recently updated</option>
        <option value="oldest">Oldest updates</option>
        {displaySettings.obsolete && <option value="obsolete">Most obsolete assets</option>}
        {displaySettings.vulnerabilities && <option value="vulnerabilities">Most vulnerabilities</option>}
      </select>
      <div className="carousel-controls">
        <button disabled={!nodes.length} onClick={() => scroll(-1)}>Previous</button>
        <button disabled={!nodes.length} onClick={() => scroll(1)}>Next</button>
      </div>
    </div>
    <div className="carousel-strip" ref={strip} {...handlers}>
      {nodes.map(node => {
        const summary = getAttention(node.id)
        const attention = attentionLabel(summary)
        return <button className="app-card glass" key={node.id} onClick={() => onOpen(node.id)}>
          <span className="app-mark" aria-hidden="true">◈</span>
          <span className="app-name">
            <strong>{node.name}</strong>
            {attention
              ? <small className="attention-label" data-vulnerable={Boolean(summary.vulnerabilities)} title={attention}>{attention}</small>
              : <small title={node.description}>{node.description}</small>}
          </span>
          <span className="app-badge" title={measure?.label ?? lens.label}>{
            measure ? formatOverviewScore(measure, measure.scores.get(node.id)) : formatMetric(values.get(node.id), lens)
          }</span>
        </button>
      })}
      {!nodes.length && <p>{query.trim() ? 'No matching applications.' : 'No applications in this graph.'}</p>}
    </div>
  </section>
}
