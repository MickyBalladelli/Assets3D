import * as T from 'three'
import type { DataCenter } from './graph'

const accents = ['#6ee5db', '#edb977', '#a6acff', '#e8a1cb', '#8ebff9']

export function createSitePlatform(site: DataCenter, index: number, center: T.Vector3, width: number, depth: number, count: number) {
  const accent = accents[index % accents.length]
  const group = new T.Group()
  group.position.copy(center)
  group.position.y = -.86

  const slab = new T.Mesh(new T.BoxGeometry(width, .22, depth), new T.MeshStandardMaterial({
    color: new T.Color(accent).multiplyScalar(.12), metalness: .53, roughness: .52
  }))
  slab.position.y = -.11
  group.add(slab)

  const lineMaterial = new T.LineBasicMaterial({ color: accent, transparent: true, opacity: .69 })
  const halfWidth = width / 2
  const halfDepth = depth / 2
  const corners = [
    new T.Vector3(-halfWidth, .012, -halfDepth),
    new T.Vector3(halfWidth, .012, -halfDepth),
    new T.Vector3(halfWidth, .012, halfDepth),
    new T.Vector3(-halfWidth, .012, halfDepth)
  ]
  group.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(corners), lineMaterial))
  const rail = new T.Mesh(new T.BoxGeometry(width * .44, .032, .04), new T.MeshBasicMaterial({ color: accent }))
  rail.position.set(0, -.045, halfDepth + .01)
  group.add(rail)

  const label = document.createElement('button')
  label.type = 'button'
  label.tabIndex = -1
  label.className = 'site-platform-label'
  label.setAttribute('aria-hidden', 'true')
  label.style.setProperty('--site-color', accent)
  label.hidden = true
  const name = document.createElement('strong')
  name.textContent = site.name
  const details = document.createElement('span')
  details.textContent = [site.code, count + (count === 1 ? ' asset' : ' assets')].filter(Boolean).join(' · ')
  label.append(name, details)

  return {
    group, label,
    anchor: new T.Vector3(center.x, group.position.y, center.z + halfDepth + .23)
  }
}
