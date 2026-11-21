import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import type { NodeType } from './registry'

export const applicationBandType: NodeType = {
  label: 'Rank band',
  icon: '▤',
  role: 'core',
  create() {
    const model = new Group()
    const frame = new MeshStandardMaterial({ color: '#30445b', metalness: .72, roughness: .31 })
    const signal = new MeshStandardMaterial({ color: '#78cce5', emissive: '#78cce5', metalness: .32, roughness: .38 })
    signal.userData.signalTint = .5
    const deck = new BoxGeometry(1.42, .15, 1.03)
    const trim = new BoxGeometry(1.21, .065, .88)
    for (let level = 0; level < 4; level++) {
      const y = -.5 + level * .28
      const layer = new Mesh(deck, frame)
      layer.position.y = y
      model.add(layer)
      const light = new Mesh(trim, signal)
      light.position.y = y + .096
      light.userData.signal = true
      model.add(light)
    }
    return model
  }
}
