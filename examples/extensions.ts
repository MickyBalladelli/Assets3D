import { Group, Mesh, MeshStandardMaterial, TetrahedronGeometry } from 'three'
import { metricLens } from '../src/graph'
import { createRegistry, defaultRegistry } from '../src/registry'

export const registry = createRegistry()
for (const [id, nodeType] of defaultRegistry.types) registry.registerNodeType(id, nodeType)
for (const lens of defaultRegistry.lenses.values()) registry.registerLens(lens)

registry.registerNodeType('load-balancer', {
  label: 'Load balancer',
  icon: '△',
  role: 'edge',
  create() {
    const model = new Group()
    const material = new MeshStandardMaterial({
      color: '#a5d8ff', emissive: '#a5d8ff', metalness: .45, roughness: .28
    })
    const prism = new Mesh(new TetrahedronGeometry(.9), material)
    prism.userData.signal = true
    model.add(prism)
    return model
  }
})

const temperature = metricLens('temperature', 'Temperature', '°C', 100, ['#9eafff', '#83e7cf', '#ffe1a3', '#ff9377'])
registry.registerLens({
  ...temperature,
  aggregate: values => Math.max(...values)
})
