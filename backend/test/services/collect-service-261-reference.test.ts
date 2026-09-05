import * as assert from 'node:assert'
import { test } from 'node:test'

import { type LtaDataMallClient } from '../../src/clients/lta-datamall.ts'
import { collectService261Reference } from '../../src/services/collect-service-261-reference.ts'

test('collects service 261 across paginated routes and unique bus stops', async () => {
  const calls: Array<{ path: string; query?: Record<string, string | number | undefined> }> = []
  const firstPage = Array.from({ length: 500 }, (_, index) => ({
    ServiceNo: index === 0 ? '261' : '1',
    BusStopCode: index === 0 ? '54009' : '01012'
  }))
  const client: LtaDataMallClient = {
    async get(path, query) {
      if (query === undefined) {
        calls.push({ path })
      } else {
        calls.push({ path, query })
      }

      if (path === 'BusRoutes' && query?.$skip === 0) {
        return { value: firstPage }
      }
      if (path === 'BusRoutes' && query?.$skip === 500) {
        return {
          value: [
            { ServiceNo: '261', BusStopCode: '54009' },
            { ServiceNo: '261', BusStopCode: '54019' }
          ]
        }
      }
      if (path === 'BusServices') {
        return { value: [{ ServiceNo: '261', Direction: 1 }] }
      }
      if (path === 'BusStops') {
        return { value: [{ BusStopCode: query?.BusStopCode }] }
      }

      throw new Error(`Unexpected LTA request: ${path}`)
    }
  }

  const snapshot = await collectService261Reference(client, '2026-09-05T00:00:00.000Z')

  assert.equal(snapshot.routePageCount, 2)
  assert.equal(snapshot.routeStops.length, 3)
  assert.deepStrictEqual(snapshot.service, [{ ServiceNo: '261', Direction: 1 }])
  assert.deepStrictEqual(snapshot.busStops, [{ BusStopCode: '54009' }, { BusStopCode: '54019' }])
  assert.deepStrictEqual(calls.slice(0, 2), [
    { path: 'BusRoutes', query: { $skip: 0 } },
    { path: 'BusRoutes', query: { $skip: 500 } }
  ])
})
