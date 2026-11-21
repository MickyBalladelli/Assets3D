import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { applicationRankingColors, scope, type Edge, type Graph, type Lens } from './graph'
import { genericType, type Registry } from './registry'
import { formatOverviewScore, type OverviewMeasure } from './applicationCriteria'
import type { GetAttention } from './attention'
import { createSitePlatform } from './sitePlatform'

export type CameraCommand = 'reset' | 'focus' | 'in' | 'out'
type Encoding = ReturnType<Lens['encode']>

interface Asset {
  id: string
  group: T.Group
  label: HTMLButtonElement
  home: T.Vector3
  age: number
  exiting: boolean
  signal: Set<T.MeshStandardMaterial>
  color: T.Color
  halo: T.Sprite
  drift: T.Vector3
  movingParts: T.Object3D[]
}

interface Flow {
  from: Asset
  to: Asset
  mesh: T.Mesh<T.TubeGeometry, T.MeshBasicMaterial>
  curve: T.QuadraticBezierCurve3
  weight: number
  phase: number
  speed: number
}

function dispose(object: T.Object3D) {
  object.traverse(child => {
    if (child instanceof T.Sprite) {
      child.material.dispose()
      return
    }
    if (!(child instanceof T.Mesh || child instanceof T.Line)) return
    child.geometry.dispose()
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of materials) material.dispose()
  })
}

export function createStage(
  host: HTMLElement,
  onOpen: (id: string) => void,
  onLost: () => void,
  onSite: (id: string) => void,
  onHover: (id: string | null) => void
) {
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setClearColor(0, 0)
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.17
  renderer.domElement.setAttribute('aria-hidden', 'true')
  host.prepend(renderer.domElement)

  const scene = new T.Scene()
  scene.fog = new T.FogExp2('#0a1017', .024)
  const room = new RoomEnvironment()
  const pmrem = new T.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(room, .04)
  scene.environment = environment.texture
  scene.environmentIntensity = .67
  room.dispose()
  pmrem.dispose()

  scene.add(new T.HemisphereLight('#b9dcfc', '#253345', 2))
  const key = new T.DirectionalLight('#c3e9ff', 3.2)
  key.position.set(-5, 9, 6)
  const rim = new T.DirectionalLight('#73f8dd', 2)
  rim.position.set(7, 2, -6)
  scene.add(key, rim)

  const floor = new T.Group()
  floor.position.y = -1.2
  const grid = new T.GridHelper(100, 100, '#274555', '#192934')
  grid.material.transparent = true
  grid.material.opacity = .55
  floor.add(grid)
  for (const radius of [2.35, 4.4, 6.4, 9.1]) {
    const points = new T.EllipseCurve(0, 0, radius, radius).getPoints(128)
    const ring = new T.LineLoop(new T.BufferGeometry().setFromPoints(points), new T.LineBasicMaterial({ color: '#416773', transparent: true, opacity: .35 }))
    ring.rotation.x = -Math.PI / 2
    ring.position.y = .012
    floor.add(ring)
  }
  scene.add(floor)

  const haloPixels = new Uint8Array(32 * 32 * 4)
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const offset = (y * 32 + x) * 4
      const distance = Math.hypot(x - 15.5, y - 15.5) / 15.5
      haloPixels.set([255, 255, 255, Math.round(255 * Math.max(0, 1 - distance) ** 3)], offset)
    }
  }
  const haloTexture = new T.DataTexture(haloPixels, 32, 32)
  haloTexture.magFilter = T.LinearFilter
  haloTexture.needsUpdate = true

  const camera = new T.PerspectiveCamera(41, 1, .1, 700)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI * .52
  controls.minDistance = 2
  controls.maxDistance = 260
  const direction = new T.Vector3(.29, .57, 1).normalize()
  const siteDirection = new T.Vector3(.08, 1.52, 1).normalize()
  const siteRight = new T.Vector3().crossVectors(camera.up, siteDirection).normalize()
  const siteUp = new T.Vector3().crossVectors(siteDirection, siteRight)
  const siteBounds = new T.Box3()
  const overviewSlots: T.Vector3[] = []
  const overviewColors = applicationRankingColors.map(hex => new T.Color(hex))
  const rankColor = new T.Color()
  const animatedPosition = new T.Vector3()
  let highestApplication = ''
  let lowestApplication = ''
  let rebuildOverviewFlows: (() => void) | undefined
  let flowEdges: Edge[] = []
  let viewOverviewOrder: string[] = []
  const metricFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })
  camera.position.copy(direction).multiplyScalar(15)
  controls.update()

  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const ray = new T.Raycaster()
  const pointer = new T.Vector2(2, 2)
  const projected = new T.Vector3()
  const matrix = new T.Matrix4()
  const pulsePoint = new T.Vector3()
  const bend = new T.Vector3()
  const color = new T.Color()
  const origin = new T.Vector3()
  const assets: Asset[] = []
  const platforms: ReturnType<typeof createSitePlatform>[] = []
  let flows: Flow[] = []
  let particles: T.InstancedMesh | undefined
  let encodings = new Map<string, Encoding>()
  const neighbors = new Map<string, Set<string>>()
  let hovered = ''
  let labelHover = ''
  let reportedHover = ''
  let focus = ''
  let radius = 5
  let signature = ''
  let currentRegistry: Registry | undefined
  type CameraPose = { target: T.Vector3, position: T.Vector3 }
  let flight: (CameraPose & { next?: CameraPose }) | undefined
  let viewPath: string[] | undefined
  let viewLocation = ''
  let startX = 0
  let startY = 0
  let width = 1
  let height = 1
  let frame = 0
  let last = performance.now()
  let elapsed = 0

  function resize() {
    const previousAspect = camera.aspect
    width = Math.max(1, host.clientWidth)
    height = Math.max(1, host.clientHeight)
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if (assets.length && Math.abs(previousAspect - camera.aspect) > .08) command('reset')
  }

  function command(action: CameraCommand) {
    if (action === 'reset' && (platforms.length || overviewSlots.length)) {
      const target = siteBounds.getCenter(new T.Vector3())
      const vertical = Math.tan(T.MathUtils.degToRad(camera.fov / 2))
      const horizontal = vertical * camera.aspect
      let distance = 8
      const points = overviewSlots.length
        ? overviewSlots.flatMap(slot => [-1.2, 1.2].flatMap(x => [-1.2, 1.2].map(z => new T.Vector3(slot.x + x, 0, slot.z + z))))
        : [siteBounds.min.x, siteBounds.max.x].flatMap(x => [siteBounds.min.z, siteBounds.max.z].map(z => new T.Vector3(x, 0, z)))
      for (const point of points) {
        const corner = point.sub(target)
        const framing = Math.max(
          Math.abs(corner.dot(siteRight)) / (horizontal * (overviewSlots.length ? .97 : .93)),
          Math.abs(corner.dot(siteUp)) / (vertical * (overviewSlots.length ? .79 : .88))
        )
        distance = Math.max(distance, corner.dot(siteDirection) + framing)
      }
      flight = { target, position: target.clone().addScaledVector(siteDirection, distance) }
      return
    }
    if (action === 'reset' || action === 'focus') {
      const focusAsset = assets.find(asset => !asset.exiting && asset.id === focus)
      const target = action === 'focus' && focusAsset ? focusAsset.home.clone() : origin.clone()
      const fit = Math.min(1, camera.aspect * 1.2)
      const distance = action === 'focus' && focusAsset ? 5.9 : Math.max(8, (radius + 1.8) / (.35 * fit))
      flight = { target, position: target.clone().addScaledVector(direction, distance) }
      return
    }
    const offset = camera.position.clone().sub(controls.target)
    const distance = T.MathUtils.clamp(offset.length() * (action === 'in' ? .8 : 1.25), controls.minDistance, controls.maxDistance)
    flight = { target: controls.target.clone(), position: controls.target.clone().add(offset.setLength(distance)) }
  }

  function setLens(lens: Lens, values: Map<string, number>, overviewMeasure?: OverviewMeasure) {
    const live = assets.filter(asset => !asset.exiting)
    encodings = new Map(live.map(asset => [asset.id, lens.encode(values.get(asset.id) ?? 0)]))
    if (!overviewSlots.length) return

    const byId = new Map(live.map(asset => [asset.id, asset]))
    const scores = overviewMeasure?.scores ?? values
    const ordered = viewOverviewOrder
    const low = ordered.find(id => scores.has(id))
    const high = low === undefined ? undefined : ordered.at(-1)
    const minimum = low === undefined ? undefined : scores.get(low)
    const maximum = high === undefined ? undefined : scores.get(high)
    highestApplication = high ?? ''
    lowestApplication = low ?? ''
    let moved = false
    ordered.forEach((id, index) => {
      const asset = byId.get(id)
      const slot = overviewSlots[index]
      const encoding = encodings.get(id)
      if (!asset || !slot || !encoding) return
      const value = scores.get(id)
      const t = value === undefined || minimum === undefined || maximum === undefined || minimum === maximum
        ? .5
        : T.MathUtils.clamp((value - minimum) / (maximum - minimum), 0, 1)
      const segment = t < .5 ? 0 : 1
      const rankingColor = value === undefined ? '#758496' : '#' + rankColor
        .copy(overviewColors[segment])
        .lerp(overviewColors[segment + 1], t * 2 - segment)
        .getHexString()
      encodings.set(id, { ...encoding, color: rankingColor })
      if (asset.home.x !== slot.x || asset.home.z !== slot.z) moved = true
      asset.home.copy(slot)
      asset.label.title = overviewMeasure ? overviewMeasure.label + ' · ' + formatOverviewScore(overviewMeasure, value) : lens.label + ' · ' + (value === undefined ? 'Unavailable' :
        metricFormatter.format(value) + (lens.unit === '%' ? '%' : ' ' + lens.unit))
    })
    if (moved) rebuildOverviewFlows?.()
  }

  function setAttention(getAttention: GetAttention) {
    for (const { id, label, exiting } of assets) {
      if (exiting) continue
      const summary = getAttention(id)
      label.dataset.attention = summary.vulnerabilities ? 'vulnerable' : summary.obsolete ? 'obsolete' : ''
    }
  }

  function clearFlows() {
    for (const flow of flows) {
      scene.remove(flow.mesh)
      dispose(flow.mesh)
    }
    flows = []
    if (particles) {
      scene.remove(particles)
      dispose(particles)
      particles.dispose()
      particles = undefined
    }
  }

  function clearPlatforms() {
    for (const platform of platforms) {
      scene.remove(platform.group)
      dispose(platform.group)
      platform.label.remove()
    }
    platforms.length = 0
  }

  function remove(asset: Asset) {
    scene.remove(asset.group)
    dispose(asset.group)
    asset.label.remove()
  }

  function show(graph: Graph, path: string[], registry: Registry, locationId: string) {
    const view = scope(graph, path, locationId)
    flowEdges = view.edges
    viewOverviewOrder = path.length ? [] : view.ids
    const previousPath = viewPath
    const locationChanged = viewLocation !== locationId
    const entered = previousPath && path.length > previousPath.length
    const backedOut = previousPath && path.length < previousPath.length
    const pathChanged = !previousPath || previousPath.length !== path.length || path.some((id, index) => previousPath[index] !== id)
    const siteLayout = path.length === 1
      ? view.focus?.children?.map(({ nodeId }) => graph.nodes[nodeId]?.locationId)
      : undefined
    const key = JSON.stringify([
      path, locationId, siteLayout,
      [...view.ids].sort().map(id => {
        const { type, name, description, health, specs, children, locationId } = graph.nodes[id]
        return [id, type, name, description, health, specs, children, locationId, locationId ? graph.locations?.[locationId] : undefined]
      }),
      view.edges.map(edge => [edge.source, edge.target, edge.protocol])
    ])
    if (signature === key && currentRegistry === registry) {
      let index = 0
      for (const edge of view.edges) {
        if (edge.source !== edge.target) flows[index++].weight = edge.weight
      }
      return
    }
    viewPath = path
    viewLocation = locationId
    signature = key
    currentRegistry = registry
    const previous = new Map(assets.filter(asset => !asset.exiting).map(asset => [asset.id, asset.group.position.clone()]))
    const overviewChanged = !path.length && (view.ids.length !== previous.size || view.ids.some(id => !previous.has(id)))
    clearFlows()
    clearPlatforms()
    overviewSlots.length = 0
    highestApplication = ''
    lowestApplication = ''
    rebuildOverviewFlows = undefined
    for (const asset of assets) {
      asset.exiting = true
      asset.label.hidden = true
    }
    hovered = ''
    labelHover = ''
    neighbors.clear()
    focus = view.focus?.id ?? ''
    const lowDetail = view.ids.length > 30
    const current = new Map<string, Asset>()
    const visible = new Set(view.ids)
    const bySite = new Map<string, string[]>()
    if (path.length === 1 && graph.locations) {
      for (const { nodeId } of view.focus?.children ?? []) {
        const site = graph.nodes[nodeId]?.locationId
        if (!site || !graph.locations[site]) continue
        const members = bySite.get(site) ?? []
        if (!members.includes(nodeId)) members.push(nodeId)
        bySite.set(site, members)
      }
    }
    const others = view.ids.filter(id => id !== focus && !bySite.has(graph.nodes[id].locationId ?? ''))
    const roleOrder = ['core', 'compute', 'data', 'edge', 'module']
    others.sort((a, b) => roleOrder.indexOf((registry.types.get(graph.nodes[a].type) ?? genericType).role)
      - roleOrder.indexOf((registry.types.get(graph.nodes[b].type) ?? genericType).role)
      || (graph.nodes[a].locationId ?? '').localeCompare(graph.nodes[b].locationId ?? ''))
    radius = 2
    let ringIndex = 0
    let ringCapacity = 0
    let ringStart = 0
    let ringRadius = 0
    if (!path.length && others.length) {
      const rows = Math.ceil(others.length / Math.ceil(Math.sqrt(others.length * 1.18)))
      const columns = Math.ceil(others.length / rows)
      const spacingX = 6.65
      const spacingZ = 5.35
      const risePerColumn = 1.45
      for (let index = 0; index < others.length; index++) {
        const column = Math.floor(index / rows)
        const row = index % rows
        const count = Math.min(rows, others.length - column * rows)
        const centeredColumn = column - (columns - 1) / 2
        const centeredRow = rows - count + row - (rows - 1) / 2
        overviewSlots.push(new T.Vector3(
          centeredColumn * spacingX,
          0,
          -centeredRow * spacingZ - centeredColumn * risePerColumn
        ))
        createAsset(others[index], overviewSlots[index].clone(), index)
      }
    } else others.forEach((id, index) => {
      if (index === ringStart) {
        ringRadius = (focus ? 2.95 : 3.15) + ringIndex * 2.8
        ringCapacity = Math.min(Math.floor(2 * Math.PI * ringRadius / 3.05), others.length - index)
        ringIndex++
      }
      const angle = (index - ringStart) * Math.PI * 2 / ringCapacity + (focus ? .32 : Math.PI / 2)
      const home = !focus && others.length === 1 ? new T.Vector3() : new T.Vector3(
        Math.cos(angle) * ringRadius, 0, Math.sin(angle) * ringRadius
      )
      radius = Math.max(radius, Math.hypot(home.x, home.z))
      createAsset(id, home, index + 1)
      if (index + 1 === ringStart + ringCapacity) ringStart = index + 1
    })
    if (focus) createAsset(focus, new T.Vector3(), 0)

    if (overviewSlots.length) {
      siteBounds.makeEmpty()
      for (const slot of overviewSlots) siteBounds.expandByPoint(slot)
      siteBounds.expandByVector(new T.Vector3(1.2, 0, 1.2))
    } else {
      siteBounds.set(new T.Vector3(-radius - 1, 0, -radius - 1), new T.Vector3(radius + 1, 0, radius + 1))
    }
    const columnSpacing = 4.65
    const rowSpacing = 4.1
    const plaqueGutter = 1.4
    const sites = [...bySite].sort(([a], [b]) => a.localeCompare(b)).map(([id, members]) => {
      const columns = Math.ceil(Math.sqrt(members.length * .6))
      const rows = Math.ceil(members.length / columns)
      const width = (columns - 1) * columnSpacing + 2.8
      const depth = (rows - 1) * rowSpacing + 2.65 + plaqueGutter
      return { id, members, columns, rows, width, depth, radius: Math.hypot(width, depth) / 2 }
    })
    if (sites.length) {
      const largest = Math.max(...sites.map(site => site.radius))
      const gap = sites.length > 1 ? (largest + .32) / Math.sin(Math.PI / sites.length) : 0
      const orbit = Math.max(radius + largest + .9, gap)
      sites.forEach((site, index) => {
        if (locationId && locationId !== site.id) return
        const angle = Math.PI / 2 + index * Math.PI * 2 / sites.length
        const center = new T.Vector3(Math.cos(angle) * orbit, 0, Math.sin(angle) * orbit)
        const dataCenter = graph.locations?.[site.id]
        if (!dataCenter) return
        const platform = createSitePlatform(dataCenter, index, center, site.width, site.depth, site.members.length)
        platform.label.onclick = () => onSite(locationId === site.id ? '' : site.id)
        platform.label.dataset.selected = String(locationId === site.id)
        platform.label.title = locationId ? 'Show all data centers' : 'Show ' + dataCenter.name
        scene.add(platform.group)
        host.prepend(platform.label)
        platforms.push(platform)
        siteBounds.expandByPoint(new T.Vector3(center.x - site.width / 2, 0, center.z - site.depth / 2))
        siteBounds.expandByPoint(new T.Vector3(center.x + site.width / 2, 0, center.z + site.depth / 2 + .45))
        radius = Math.max(radius, orbit + site.radius)
        site.members.forEach((id, member) => {
          if (!visible.has(id)) return
          const column = member % site.columns
          const row = Math.floor(member / site.columns)
          const rowCount = Math.min(site.columns, site.members.length - row * site.columns)
          const x = (column - (rowCount - 1) / 2) * columnSpacing
          const z = (row - (site.rows - 1) / 2) * rowSpacing - plaqueGutter / 2
          const home = center.clone().add(new T.Vector3(x, 0, z))
          createAsset(id, home, others.length + member + 1)
        })
      })
    }

    function createAsset(id: string, home: T.Vector3, index: number) {
      const node = graph.nodes[id]
      const type = registry.types.get(node.type) ?? genericType
      const group = type.create(node, id === focus && Boolean(node.children?.length), lowDetail)
      group.userData.id = id
      group.position.copy(home)
      group.scale.setScalar(.001)
      group.visible = false
      const label = document.createElement('button')
      label.className = 'asset-label'
      label.type = 'button'
      label.tabIndex = -1
      label.setAttribute('aria-hidden', 'true')
      label.textContent = node.name
      const location = node.locationId ? graph.locations?.[node.locationId] : undefined
      label.title = [type.label, node.health, location?.name].filter(Boolean).join(' · ')
      if (location) label.dataset.location = location.code ?? location.name
      label.dataset.health = node.health ?? ''
      label.hidden = true
      label.onpointerenter = event => { if (event.pointerType !== 'touch') labelHover = id }
      label.onpointerleave = () => { labelHover = '' }
      label.onclick = () => onOpen(id)
      host.append(label)
      const signal = new Set<T.MeshStandardMaterial>()
      const movingParts: T.Object3D[] = []
      group.traverse(child => {
        if (child instanceof T.Mesh && child.userData.signal && child.material instanceof T.MeshStandardMaterial) signal.add(child.material)
        if (child.userData.explode instanceof T.Vector3) {
          child.userData.origin = child.position.clone()
          movingParts.push(child)
        }
      })
      scene.add(group)
      const halo = new T.Sprite(new T.SpriteMaterial({
        map: haloTexture, color: '#83dfdf', transparent: true, opacity: 0,
        blending: T.AdditiveBlending, depthWrite: false
      }))
      halo.position.y = .28
      halo.scale.set(3.4, 3.4, 1)
      group.add(halo)
      const startsInChassis = focus && id !== focus && type.role === 'module'
      const start = previous.get(id) ?? (startsInChassis ? origin : home.clone().multiplyScalar(.87))
      const drift = start.clone().sub(home)
      if (!path.length) group.position.copy(start)
      const asset = { id, group, label, home, age: -.065 * Math.min(index, 14), exiting: false, signal, color: new T.Color('#83dfdf'), halo, drift, movingParts }
      assets.push(asset)
      current.set(id, asset)
    }

    function buildFlows() {
      flowEdges.forEach((edge, index) => {
        const from = current.get(edge.source)
        const to = current.get(edge.target)
        if (!from || !to || from === to) return
        const start = from.home.clone().add(new T.Vector3(0, .13, 0))
        const end = to.home.clone().add(new T.Vector3(0, .13, 0))
        bend.copy(start).lerp(end, .5)
        bend.y += .54 + Math.min(1.2, start.distanceTo(end) * .18)
        const curve = new T.QuadraticBezierCurve3(start, bend.clone(), end)
        const geometry = new T.TubeGeometry(curve, lowDetail ? 10 : 24, 1, 5, false)
        const centers = new Float32Array(geometry.attributes.position.count * 3)
        const position = geometry.attributes.position
        const offsets = Float32Array.from(position.array)
        for (let segment = 0; segment <= (lowDetail ? 10 : 24); segment++) {
          const center = curve.getPointAt(segment / (lowDetail ? 10 : 24))
          for (let side = 0; side < 6; side++) {
            const vertex = (segment * 6 + side) * 3
            centers.set(center.toArray(), vertex)
            offsets[vertex] -= center.x
            offsets[vertex + 1] -= center.y
            offsets[vertex + 2] -= center.z
          }
        }
        geometry.userData = { centers, offsets, thickness: 1 }
        const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial({ color: '#84b9ca', transparent: true, opacity: 0, depthWrite: false }))
        scene.add(mesh)
        flows.push({ from, to, mesh, curve, weight: edge.weight, phase: index * .27 % 1, speed: .21 })
        if (!neighbors.has(from.id)) neighbors.set(from.id, new Set())
        if (!neighbors.has(to.id)) neighbors.set(to.id, new Set())
        neighbors.get(from.id)?.add(to.id)
        neighbors.get(to.id)?.add(from.id)
      })
      if (flows.length) {
        particles = new T.InstancedMesh(new T.SphereGeometry(.055, 6, 4), new T.MeshBasicMaterial({ color: '#ffffff' }), flows.length)
        particles.frustumCulled = false
        scene.add(particles)
      }
    }
    buildFlows()
    if (!path.length && view.edges.length) rebuildOverviewFlows = () => {
      clearFlows()
      buildFlows()
    }
    if (!pathChanged && !locationChanged && !overviewChanged) return
    command('reset')
    if (!flight || reduced.matches) return
    const destination = flight
    const entry = entered ? previous.get(focus) : undefined
    if (entry) {
      flight = {
        target: entry.clone(),
        position: entry.clone().addScaledVector(direction, destination.position.distanceTo(destination.target) * .72),
        next: destination
      }
    } else if (backedOut) {
      const departing = current.get(previousPath.at(-1) ?? '')?.home ?? origin
      const target = departing.clone().multiplyScalar(.45)
      flight = {
        target,
        position: target.clone().addScaledVector(direction, destination.position.distanceTo(destination.target) * 1.12),
        next: destination
      }
    }
  }

  function render(time: number) {
    frame = requestAnimationFrame(render)
    const dt = Math.min(.04, (time - last) / 1000)
    last = time
    elapsed += dt
    const blend = reduced.matches ? 1 : 1 - Math.exp(-dt * 7)
    if (flight) {
      controls.target.lerp(flight.target, blend * .85 + (reduced.matches ? .15 : 0))
      camera.position.lerp(flight.position, blend * .85 + (reduced.matches ? .15 : 0))
      const threshold = flight.next ? .18 : .0001
      if (camera.position.distanceToSquared(flight.position) < threshold && controls.target.distanceToSquared(flight.target) < threshold) {
        flight = flight.next
      }
    }
    controls.update()
    const active = labelHover || hovered
    if (active !== reportedHover) {
      reportedHover = active
      onHover(active || null)
    }
    for (const { anchor, label } of platforms) {
      projected.copy(anchor).project(camera)
      label.hidden = Math.abs(projected.x) > .99 || Math.abs(projected.y) > 1 || projected.z < -1 || projected.z > 1
      if (!label.hidden) {
        const x = (projected.x + 1) * width / 2
        const y = (1 - projected.y) * height / 2
        label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateX(-50%)`
      }
    }
    for (let i = assets.length - 1; i >= 0; i--) {
      const asset = assets[i]
      const { group, home, label, id } = asset
      if (asset.exiting) {
        group.scale.multiplyScalar(reduced.matches ? 0 : 1 - blend)
        group.position.y += dt * .8
        if (group.scale.x < .035) {
          remove(asset)
          assets.splice(i, 1)
        }
        continue
      }
      asset.age += reduced.matches ? 1 : dt
      if (asset.age < 0) continue
      group.visible = true
      const encoding = encodings.get(id)
      const related = !active || active === id || neighbors.get(active)?.has(id)
      const entrance = reduced.matches ? 1 : 1 - Math.exp(-asset.age * 7) * Math.cos(asset.age * 10)
      const scale = (encoding?.scale ?? 1) * (related ? 1 : .78) * (active === id ? 1.14 : 1)
      group.scale.setScalar(T.MathUtils.lerp(group.scale.x, scale, blend))
      animatedPosition.copy(home).addScaledVector(asset.drift, 1 - entrance)
      animatedPosition.y += (entrance - 1) * 1.15 + (reduced.matches ? 0 : Math.sin(elapsed * 1.2 + i) * .075)
      if (overviewSlots.length) group.position.lerp(animatedPosition, blend)
      else group.position.copy(animatedPosition)
      group.rotation.y = .14 + (reduced.matches ? 0 : Math.sin(elapsed * .55 + i) * .15)
      asset.color.lerp(color.set(encoding?.color ?? '#84dddd'), blend)
      asset.halo.material.color.copy(asset.color)
      asset.halo.material.opacity = T.MathUtils.lerp(asset.halo.material.opacity,
        related ? Math.max(0, (encoding?.glow ?? .3) - .23) * .5 + (active === id ? .23 : 0) : 0, blend)
      for (const material of asset.signal) {
        const tint = material.userData.signalTint ?? 1
        const gain = material.userData.signalGlow ?? 1
        material.color.copy(asset.color).multiplyScalar(tint)
        material.emissive.copy(asset.color)
        const glow = related ? (encoding?.glow ?? .4) + (active === id ? .65 : 0) : .02
        material.emissiveIntensity = T.MathUtils.lerp(material.emissiveIntensity, glow * gain, blend)
      }
      for (const part of asset.movingParts) {
        part.position.copy(part.userData.origin).addScaledVector(part.userData.explode, entrance)
      }
      projected.copy(group.position)
      projected.y -= .78 * group.scale.x
      projected.project(camera)
      const hidden = projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > .99 || Math.abs(projected.y) > 1 ||
        (!overviewSlots.length && !platforms.length && assets.length > 30 && id !== focus && id !== active && id !== highestApplication && id !== lowestApplication)
      label.hidden = hidden
      if (!hidden) {
        const x = (projected.x + 1) * width / 2
        const y = (1 - projected.y) * height / 2
        label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateX(-50%)`
        label.style.opacity = related ? '1' : '.38'
        label.dataset.active = String(id === active || id === focus)
        label.dataset.highest = String(id === highestApplication)
        label.dataset.lowest = String(id === lowestApplication && id !== highestApplication)
      }
    }
    flows.forEach((flow, i) => {
      const encoding = encodings.get(flow.from.id)
      const related = !active || active === flow.from.id || active === flow.to.id
      const visible = flow.from.age > 0 && flow.to.age > 0
      const material = flow.mesh.material
      material.color.lerp(flow.from.color, blend)
      material.opacity = T.MathUtils.lerp(material.opacity, visible ? related ? .35 + .35 * flow.weight : .10 : 0, blend)
      const geometry = flow.mesh.geometry
      const data = geometry.userData
      const thickness = T.MathUtils.lerp(data.thickness, (encoding?.thickness ?? .02) * (.65 + flow.weight), blend)
      if (Math.abs(data.thickness - thickness) > .0003) {
        const position = geometry.attributes.position
        for (let j = 0; j < position.array.length; j++) position.array[j] = data.centers[j] + data.offsets[j] * thickness
        position.needsUpdate = true
        data.thickness = thickness
      }
      if (particles) {
        flow.speed = T.MathUtils.lerp(flow.speed, (encoding?.pulse ?? .24) * (.55 + flow.weight), blend)
        flow.phase = (flow.phase + dt * flow.speed) % 1
        flow.curve.getPoint(reduced.matches ? .66 : flow.phase, pulsePoint)
        matrix.makeScale(visible && related ? 1 : 0, visible && related ? 1 : 0, visible && related ? 1 : 0)
        matrix.setPosition(pulsePoint)
        particles.setMatrixAt(i, matrix)
        particles.setColorAt(i, flow.from.color)
      }
    })
    if (particles) {
      particles.instanceMatrix.needsUpdate = true
      if (particles.instanceColor) particles.instanceColor.needsUpdate = true
    }
    renderer.render(scene, camera)
  }

  function pick(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.set((event.clientX - rect.left) / width * 2 - 1, 1 - (event.clientY - rect.top) / height * 2)
    ray.setFromCamera(pointer, camera)
    const hit = ray.intersectObjects(assets.filter(asset => !asset.exiting && asset.group.visible).map(asset => asset.group), true).find(entry => !(entry.object instanceof T.Sprite))
    let object: T.Object3D | undefined = hit?.object
    while (object && !object.userData.id) object = object.parent ?? undefined
    return (object?.userData.id as string | undefined) ?? ''
  }

  const canvas = renderer.domElement
  const move = (event: PointerEvent) => { hovered = event.buttons || event.pointerType === 'touch' ? '' : pick(event)
    canvas.style.cursor = hovered ? 'pointer' : '' }
  const leave = () => { hovered = '' }
  const down = (event: PointerEvent) => { startX = event.clientX
    startY = event.clientY }
  const up = (event: PointerEvent) => {
    if (event.button !== 0 || Math.hypot(event.clientX - startX, event.clientY - startY) > 5) return
    const id = pick(event)
    if (id) onOpen(id)
  }
  const cancelFlight = () => { flight = undefined }
  const lost = (event: Event) => { event.preventDefault()
    onLost() }
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerleave', leave)
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('webglcontextlost', lost)
  controls.addEventListener('start', cancelFlight)
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()
  frame = requestAnimationFrame(render)

  return {
    show, setLens, setAttention, command,
    dispose() {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      clearFlows()
      clearPlatforms()
      for (const asset of assets) remove(asset)
      dispose(floor)
      environment.dispose()
      haloTexture.dispose()
      canvas.removeEventListener('webglcontextlost', lost)
      renderer.dispose()
      canvas.remove()
    }
  }
}
