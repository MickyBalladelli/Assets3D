import assert from 'node:assert/strict'
import { test } from 'node:test'
import { builtInLenses, openPath, rollUp, scope, selectLens, type Graph } from '../src/graph'
import { sampleGraph } from '../src/sample'

const [usage, power, carbon] = builtInLenses

test('rolls up nested usage averages and adds power and carbon', () => {
  assert.equal(rollUp(sampleGraph, usage).get('meridian-01'), (95 + 89 + 84 + 79) / 4)
  assert.equal(rollUp(sampleGraph, power).get('meridian-01'), 240)
  assert.equal(rollUp(sampleGraph, power).get('meridian'), 598)
  assert.ok(Math.abs((rollUp(sampleGraph, carbon).get('meridian') ?? 0) - 185.4) < .0001)
})

test('uses explicit readings, including zero, and skips missing children', () => {
  const graph: Graph = {
    roots: ['parent'],
    edges: [],
    nodes: {
      parent: { id: 'parent', name: 'Parent', type: 'app', children: [{ nodeId: 'child' }, { nodeId: 'child' }, { nodeId: 'missing' }] },
      child: { id: 'child', name: 'Child', type: 'drive', metrics: { usage: 0, powerConsumption: 7 } }
    }
  }
  assert.equal(rollUp(graph, usage).get('parent'), 0)
  assert.equal(rollUp(graph, power).get('parent'), 7)
  assert.equal(rollUp(graph, carbon).has('parent'), false)
})

test('scopes directed edges and drills down through arbitrary nested assets', () => {
  const overview: string[] = []
  assert.equal(openPath(sampleGraph, overview, 'meridian-db'), overview)
  const app = openPath(sampleGraph, overview, 'meridian')
  assert.ok(scope(sampleGraph, app).edges.some(edge => edge.source === 'meridian-dns' && edge.target === 'meridian'))
  const server = openPath(sampleGraph, app, 'meridian-01')
  const drive = openPath(sampleGraph, server, 'meridian-01-hdd')
  const controller = openPath(sampleGraph, drive, 'meridian-01-hdd-controller')
  assert.equal(controller.length, 4)
  assert.deepEqual(scope(sampleGraph, controller).ids, ['meridian-01-hdd-controller'])
})

test('selects registered lenses by keyboard position', () => {
  assert.equal(selectLens(builtInLenses, usage, '2'), power)
  assert.equal(selectLens(builtInLenses, power, '9'), power)
})
