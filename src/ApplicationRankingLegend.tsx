import { formatOverviewScore, type OverviewMeasure } from './applicationCriteria'
import { formatMetric } from './AssetInspector'
import { applicationRankingColors, type Lens, type Node } from './graph'

interface Props {
  lens: Lens
  measure?: OverviewMeasure
  minimum: number
  maximum: number
  highest: Node
}

export function ApplicationRankingLegend({ lens, measure, minimum, maximum, highest }: Props) {
  const equal = minimum === maximum
  const background = equal ? applicationRankingColors[1] : 'linear-gradient(90deg, ' + applicationRankingColors.join(', ') + ')'
  const sortByDate = measure?.kind === 'date'
  const display = (value: number) => measure ? formatOverviewScore(measure, value) : formatMetric(value, lens)
  return <section className="ranking-legend glass" aria-label={(measure?.label ?? lens.label) + ' ranking'}>
    <div className="ranking-range">
      <span>{sortByDate ? 'Older' : 'Low'} <strong>{display(minimum)}</strong></span>
      <span>{sortByDate ? 'Newer' : 'High'} <strong>{display(maximum)}</strong></span>
    </div>
    <div className="ranking-gradient" style={{ background }} aria-hidden="true" />
    <p>{equal ? 'All measured apps tied' : <>{sortByDate ? 'Newest' : 'Highest'} <strong>{highest.name}</strong></>}</p>
  </section>
}
