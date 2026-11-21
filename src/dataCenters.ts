import type { DataCenter } from './graph'

export const dataCenters = {
  'par-01': { id: 'par-01', name: 'Paris', code: 'PAR-01', region: 'eu-west-3' },
  'fra-01': { id: 'fra-01', name: 'Frankfurt', code: 'FRA-01', region: 'eu-central-1' },
  'iad-01': { id: 'iad-01', name: 'Ashburn', code: 'IAD-01', region: 'us-east-1' }
} satisfies Record<string, DataCenter>
