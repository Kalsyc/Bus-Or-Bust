import * as assert from 'node:assert'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'

import { runMigrations } from '../../src/database/migrations.ts'
import {
  importService261Reference,
  readService261Reference
} from '../../src/services/service-261-reference.ts'

const fixturePath = path.resolve('test', 'fixtures', 'lta', 'service-261-reference.json')

test('imports the Service 261 fixture and preserves its loop stop', async () => {
  const database = new DatabaseSync(':memory:')
  database.exec('PRAGMA foreign_keys = ON')
  runMigrations(database)

  const reference = await readService261Reference(fixturePath)
  importService261Reference(database, reference, '2026-09-05T00:00:00.000Z')

  const routeStopCount = database.prepare('SELECT COUNT(*) AS count FROM service_stops').get() as {
    count: number
  }
  const terminalVisits = database
    .prepare("SELECT COUNT(*) AS count FROM service_stops WHERE bus_stop_code = '54009'")
    .get() as { count: number }
  const syncRun = database
    .prepare(
      'SELECT service_no AS serviceNo, route_page_count AS routePageCount FROM reference_sync_runs'
    )
    .get() as { serviceNo: string; routePageCount: number }

  assert.equal(routeStopCount.count, 14)
  assert.equal(terminalVisits.count, 2)
  assert.equal(syncRun.serviceNo, '261')
  assert.equal(syncRun.routePageCount, 54)

  database.close()
})
