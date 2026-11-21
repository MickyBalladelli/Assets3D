import { useMemo, useState } from 'react'
import { builtInLenses } from '../src/graph'
import { Visualizer } from '../src/Visualizer'
import { createRegistry } from '../src/registry'
import { registry } from './extensions'
import { generateFleet } from './fleet'

const fleetRegistry = createRegistry()
for (const [id, type] of registry.types) fleetRegistry.registerNodeType(id, type)
for (const lens of builtInLenses) {
  const ceiling = lens.id === 'powerConsumption' ? 6000 : lens.id === 'carbonFootprint' ? 3000 : 0
  const original = lens.id === 'powerConsumption' ? 380 : 125
  fleetRegistry.registerLens(ceiling ? {
    ...lens,
    encode: value => lens.encode(original * Math.log1p(Math.max(0, value)) / Math.log1p(ceiling))
  } : lens)
}

const number = new Intl.NumberFormat('en')

export function FleetDemo() {
  const [seed, setSeed] = useState(48163)
  const [count, setCount] = useState(32)
  const graph = useMemo(() => generateFleet(seed, count), [seed, count])
  const total = Object.keys(graph.nodes).length
  return <div className="fleet-demo">
    <header className="fleet-toolbar">
      <div className="fleet-summary">
        <strong>Fleet demo</strong>
        <span>{number.format(total)} assets <b>·</b> {number.format(graph.edges.length)} links</span>
      </div>
      <div className="fleet-actions">
        <label>Fleet size
          <select value={count} onChange={event => setCount(Number(event.target.value))}>
            <option value={12}>12 apps</option>
            <option value={32}>32 apps</option>
            <option value={64}>64 apps</option>
            <option value={1000}>1,000 apps</option>
          </select>
        </label>
        <button onClick={() => setSeed(current => (current + 1 + Math.floor(Math.random() * 999999)) >>> 0)}>Regenerate</button>
      </div>
    </header>
    <Visualizer key={seed + ':' + count} graph={graph} registry={fleetRegistry} theme={{ title: 'Stratum Fleet' }} />
  </div>
}
