import * as T from 'three'
import { createApplicationModel } from './applicationModel'
import { builtInLenses, type Lens, type Node } from './graph'

export interface NodeType {
  label: string
  icon: string
  role: 'core' | 'compute' | 'data' | 'edge' | 'module'
  create(node: Node, detail: boolean, lowDetail: boolean): T.Group
}

export function createRegistry() {
  const types = new Map<string, NodeType>()
  const lenses = new Map<string, Lens>()
  return {
    types: types as ReadonlyMap<string, NodeType>,
    lenses: lenses as ReadonlyMap<string, Lens>,
    registerNodeType(id: string, definition: NodeType) { types.set(id, definition) },
    registerLens(lens: Lens) { lenses.set(lens.id, lens) }
  }
}

export type Registry = ReturnType<typeof createRegistry>

function model(type: string, detail: boolean, lowDetail: boolean) {
  const group = new T.Group()
  const alloy = new T.MeshStandardMaterial({ color: '#445a72', metalness: .74, roughness: .31 })
  const dark = new T.MeshStandardMaterial({ color: '#152332', metalness: .38, roughness: .42 })
  const signal = new T.MeshStandardMaterial({ color: '#81e9e5', emissive: '#81e9e5', emissiveIntensity: .5, metalness: .32, roughness: .28 })
  function part(geometry: T.BufferGeometry, material: T.Material, x = 0, y = 0, z = 0) {
    const mesh = new T.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    group.add(mesh)
    return mesh
  }
  const box = (x: number, y: number, z: number) => new T.BoxGeometry(x, y, z)
  const steps = lowDetail ? 10 : 30
  if (type === 'server') {
    part(box(1.54, .14, .99), dark, 0, -.46)
    for (let row = 0; row < (lowDetail ? 2 : 4); row++) {
      const y = -.31 + row * .22
      const shell = new T.Group()
      shell.position.y = y
      if (detail && row > 0) shell.userData.explode = new T.Vector3(row * .16, row * .32, -row * .19)
      shell.add(
        part(box(1.51, .18, .92), alloy),
        part(box(1.01, .075, .035), dark, -.11, 0, .479),
        part(box(.065, .035, .036), signal, .57, 0, .479)
      )
      group.add(shell)
    }
  } else if (type === 'database') {
    for (let row = 0; row < (lowDetail ? 3 : 5); row++) {
      const y = -.45 + row * .22
      part(new T.CylinderGeometry(.67, .72, .18, steps), alloy, 0, y)
      part(new T.CylinderGeometry(.62, .62, .05, steps), signal, 0, y + .1)
    }
  } else if (type === 'certificate') {
    part(new T.OctahedronGeometry(.68), signal)
    for (let ring = 0; ring < (lowDetail ? 1 : 2); ring++) {
      const hoop = part(new T.TorusGeometry(.85 + .12 * ring, .034, 6, steps * 2), alloy)
      hoop.rotation.set(.35 + ring * 1.1, .4 + ring * .7, .2)
    }
  } else if (type === 'dns') {
    const conduit = new T.CatmullRomCurve3([
      new T.Vector3(-.65, -.35, .2), new T.Vector3(-.42, -.23, .2),
      new T.Vector3(0, .25, 0), new T.Vector3(.42, .3, -.23), new T.Vector3(.66, .45, -.23)
    ])
    part(new T.TubeGeometry(conduit, steps, .16, 8, false), alloy)
    part(new T.SphereGeometry(.21, steps, 8), signal, -.65, -.35, .2)
    part(new T.SphereGeometry(.21, steps, 8), signal, .66, .45, -.23)
  } else {
    const dimensions = type === 'memory' ? [1.3, .42, .15] : type === 'drive' ? [1.21, .22, .77] : [.84, .19, .84]
    part(box(dimensions[0], dimensions[1], dimensions[2]), alloy)
    if (type === 'memory') {
      for (let i = -2; i <= 2; i++) part(box(.15, .22, .06), signal, i * .22, 0, .095)
    } else {
      part(box(.59, .065, .51), dark, 0, dimensions[1] / 2)
      part(box(.25, .072, .25), signal, 0, dimensions[1] / 2 + .04)
    }
  }
  group.traverse(object => {
    if (object instanceof T.Mesh) {
      object.userData.signal = object.material === signal
    }
  })
  return group
}

export const defaultRegistry = createRegistry()
const definitions = {
  application: ['Application', '◈', 'core'],
  server: ['Server', '▤', 'compute'],
  database: ['Database', '▱', 'data'],
  certificate: ['Certificate', '◇', 'edge'],
  dns: ['DNS record', '⌘', 'edge'],
  cpu: ['Processor', '▦', 'module'],
  memory: ['Memory', '▥', 'module'],
  drive: ['Storage', '▰', 'module']
} as const

for (const [id, [label, icon, role]] of Object.entries(definitions)) {
  const create: NodeType['create'] = id === 'application'
    ? createApplicationModel
    : (_, detail, lowDetail) => model(id, detail, lowDetail)
  defaultRegistry.registerNodeType(id, { label, icon, role, create })
}

for (const lens of builtInLenses) defaultRegistry.registerLens(lens)

export const genericType: NodeType = {
  label: 'Asset', icon: '◇', role: 'module', create: (_, detail, lowDetail) => model('generic', detail, lowDetail)
}
