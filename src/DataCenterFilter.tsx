import type { DataCenter } from './graph'

interface Props {
  locations: DataCenter[]
  selected: string
  onChange(id: string): void
}

export function DataCenterFilter({ locations, selected, onChange }: Props) {
  return <label className="data-center-filter">
    Data center
    <select value={selected} onChange={event => onChange(event.target.value)}>
      <option value="">All data centers</option>
      {locations.map(location => <option value={location.id} key={location.id}>{location.name}</option>)}
    </select>
  </label>
}
