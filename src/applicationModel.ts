import * as T from 'three'
import type { Node } from './graph'

function chamferedPlate(width: number, depth: number, height: number, bevel: number) {
  const shape = new T.Shape()
  const x = width / 2
  const z = depth / 2
  const corner = Math.min(width, depth) * .19
  shape.moveTo(-x + corner, -z)
  shape.lineTo(x - corner, -z)
  shape.lineTo(x, -z + corner)
  shape.lineTo(x, z - corner)
  shape.lineTo(x - corner, z)
  shape.lineTo(-x + corner, z)
  shape.lineTo(-x, z - corner)
  shape.lineTo(-x, -z + corner)
  shape.closePath()
  const geometry = new T.ExtrudeGeometry(shape, {
    depth: height - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 1,
    curveSegments: 1
  })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, bevel - height / 2, 0)
  return geometry
}

export function createApplicationModel(node: Node, _detail: boolean, lowDetail: boolean) {
  const model = new T.Group()
  const chassis = new T.Group()
  model.add(chassis)
  let orientation = 0
  for (const letter of node.id) orientation = (Math.imul(orientation, 31) + letter.charCodeAt(0)) >>> 0
  chassis.rotation.y = -.34 + (orientation % 5) * .11

  const graphite = new T.MeshStandardMaterial({ color: '#1b293b', metalness: .68, roughness: .37 })
  const brushed = new T.MeshStandardMaterial({ color: '#687f94', metalness: .78, roughness: .29 })
  const lens = new T.MeshStandardMaterial({
    color: '#496574',
    metalness: .46,
    roughness: .18,
    emissive: '#54ebcf',
    emissiveIntensity: .24,
    flatShading: true
  })
  lens.userData.signalTint = .21
  lens.userData.signalGlow = .62
  const light = new T.MeshStandardMaterial({
    color: '#60ceb9', metalness: .16, roughness: .3, emissive: '#54ebcf', emissiveIntensity: .65
  })
  light.userData.signalTint = .42

  function add(geometry: T.BufferGeometry, material: T.MeshStandardMaterial, x: number, y: number, z: number) {
    const mesh = new T.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    mesh.userData.signal = material === lens || material === light
    chassis.add(mesh)
    return mesh
  }

  add(chamferedPlate(1.49, 1.11, .19, .027), graphite, 0, -.58, 0)
  add(chamferedPlate(1.35, 1, .085, .016), brushed, 0, -.45, 0)
  add(chamferedPlate(1.19, .87, .09, .018), graphite, 0, -.363, 0)

  const core = add(new T.CylinderGeometry(.44, .34, .92, 4), lens, 0, .15, 0)
  core.rotation.y = Math.PI / 4
  const crown = add(new T.CylinderGeometry(.29, .44, .18, 4), brushed, 0, .7, 0)
  crown.rotation.y = Math.PI / 4
  add(chamferedPlate(.36, .36, .042, .008), light, 0, .807, 0)

  const supports = chamferedPlate(.18, .58, .78, .026)
  for (const side of [-1, 1]) {
    const support = add(supports, graphite, side * .48, .02, 0)
    support.rotation.z = side * -.18
    const shoulder = add(chamferedPlate(.23, .62, .12, .022), brushed, side * .55, .41, 0)
    shoulder.rotation.z = side * -.18
  }

  const barCount = lowDetail ? 1 : 3
  const frontBar = new T.BoxGeometry(lowDetail ? .54 : .16, .039, .03)
  for (let index = 0; index < barCount; index++) {
    add(frontBar, light, (index - (barCount - 1) / 2) * .22, -.45, .516)
  }
  return model
}
