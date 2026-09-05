import * as assert from 'node:assert'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import Fastify from 'fastify'

import appPlugin from '../../src/app.ts'
import { runMigrations } from '../../src/database/migrations.ts'
import {
  importService261Reference,
  readService261Reference
} from '../../src/services/service-261-reference.ts'
import { build } from '../helper.js'

const fixturePath = path.resolve('test', 'fixtures', 'lta', 'service-261-reference.json')

async function buildSeededApp(t: { after: (callback: () => Promise<void>) => void }) {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'bus-or-bust-'))
  const databasePath = path.join(temporaryDirectory, 'test.sqlite')
  const database = new DatabaseSync(databasePath)
  database.exec('PRAGMA foreign_keys = ON')
  runMigrations(database)
  importService261Reference(database, await readService261Reference(fixturePath))
  database.close()

  const app = Fastify()
  await app.register(appPlugin, { databasePath })
  await app.ready()

  t.after(async () => {
    await app.close()
    await rm(temporaryDirectory, { recursive: true, force: true })
  })

  return app
}

test('returns Service 261 and its ordered route stops from SQLite', async (t) => {
  const app = await buildSeededApp(t)

  const serviceResponse = await app.inject({ url: '/services/261' })
  const stopsResponse = await app.inject({ url: '/services/261/stops' })

  assert.equal(serviceResponse.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(serviceResponse.payload), {
    serviceNo: '261',
    directions: [
      {
        direction: 1,
        operator: 'SBST',
        category: 'FEEDER',
        originCode: '54009',
        destinationCode: '54009',
        frequencies: {
          amPeak: '03-05',
          amOffpeak: '05-07',
          pmPeak: '04-07',
          pmOffpeak: '05-09'
        },
        loopDescription: 'Ang Mo Kio Ave 10'
      }
    ]
  })

  const stops = JSON.parse(stopsResponse.payload) as {
    serviceNo: string
    stops: Array<{ busStopCode: string; stopSequence: number; name: string }>
  }
  assert.equal(stopsResponse.statusCode, 200)
  assert.equal(stops.serviceNo, '261')
  assert.equal(stops.stops.length, 14)
  assert.equal(stops.stops[0]?.busStopCode, '54009')
  assert.equal(stops.stops[0]?.stopSequence, 1)
  assert.equal(stops.stops[0]?.name, 'Ang Mo Kio Int')
  assert.equal(stops.stops.at(-1)?.busStopCode, '54009')
  assert.equal(stops.stops.at(-1)?.stopSequence, 14)
  assert.equal(stops.stops.at(-1)?.name, 'Ang Mo Kio Int')
})

test('returns 404 when reference data is not available for a service', async (t) => {
  const app = await build(t)

  const response = await app.inject({ url: '/services/999' })

  assert.equal(response.statusCode, 404)
  assert.deepStrictEqual(JSON.parse(response.payload), {
    message: 'Bus service not found',
    statusCode: 404
  })
})
