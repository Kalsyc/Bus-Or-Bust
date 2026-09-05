import * as assert from 'node:assert'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { test } from 'node:test'

import { type LtaDataMallClient } from '../../src/clients/lta-datamall.ts'
import { runMigrations } from '../../src/database/migrations.ts'
import {
  collectService261ArrivalObservations,
  parseService261ArrivalPredictions
} from '../../src/services/collect-service-261-arrivals.ts'
import {
  importService261Reference,
  parseService261Reference
} from '../../src/services/service-261-reference.ts'

const fixturePath = path.resolve('test', 'fixtures', 'lta', 'service-261-reference.json')

async function createSeededDatabase(): Promise<DatabaseSync> {
  const database = new DatabaseSync(':memory:')
  database.exec('PRAGMA foreign_keys = ON')
  runMigrations(database)
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as unknown
  importService261Reference(database, parseService261Reference(fixture))
  return database
}

test('parses only populated Service 261 prediction slots', () => {
  assert.deepStrictEqual(
    parseService261ArrivalPredictions({
      Services: [
        {
          ServiceNo: '261',
          NextBus: {
            EstimatedArrival: '2026-09-05T08:30:00+08:00',
            Monitored: 1,
            Latitude: '1.3701',
            Longitude: '103.8499',
            VisitNumber: '2',
            Load: 'SEA',
            Feature: 'WAB',
            Type: 'SD'
          },
          NextBus2: { EstimatedArrival: '', Monitored: 0 }
        }
      ]
    }),
    [
      {
        queuePosition: 1,
        estimatedArrival: '2026-09-05T08:30:00+08:00',
        monitored: 1,
        originCode: null,
        destinationCode: null,
        latitude: 1.3701,
        longitude: 103.8499,
        visitNumber: 2,
        load: 'SEA',
        feature: 'WAB',
        vehicleType: 'SD'
      }
    ]
  )
})

test('records one observation cycle, including unsuccessful requests', async () => {
  const database = await createSeededDatabase()
  const client: LtaDataMallClient = {
    async get(_path, query) {
      if (query?.BusStopCode === '54261') {
        throw new Error('temporary upstream failure')
      }
      if (query?.BusStopCode === '54009') {
        return {
          Services: [
            {
              ServiceNo: '261',
              NextBus: {
                EstimatedArrival: '2026-09-05T08:30:00+08:00',
                Monitored: 1,
                OriginCode: '54009',
                DestinationCode: '54009',
                Latitude: '1.3701',
                Longitude: '103.8499',
                VisitNumber: '1',
                Load: 'SEA',
                Feature: 'WAB',
                Type: 'SD'
              },
              NextBus2: {
                EstimatedArrival: '2026-09-05T08:37:00+08:00',
                Monitored: 0,
                OriginCode: '54009',
                DestinationCode: '54009',
                Latitude: '0.0',
                Longitude: '0.0',
                VisitNumber: '2',
                Load: 'SDA',
                Feature: '',
                Type: 'DD'
              }
            }
          ]
        }
      }
      return { Services: [] }
    }
  }

  const result = await collectService261ArrivalObservations(database, client)

  assert.deepStrictEqual(result, {
    pollRunId: 1,
    requestedStopCount: 13,
    successfulStopCount: 12,
    failedStopCount: 1,
    predictionCount: 2
  })
  const failedPoll = database
    .prepare(
      'SELECT outcome, error_message AS errorMessage FROM arrival_polls WHERE bus_stop_code = ?'
    )
    .get('54261') as { outcome: string; errorMessage: string }
  assert.deepStrictEqual(
    { ...failedPoll },
    {
      outcome: 'request_failed',
      errorMessage: 'temporary upstream failure'
    }
  )
  const predictions = database
    .prepare('SELECT monitored, latitude, feature FROM arrival_predictions ORDER BY queue_position')
    .all() as Array<{ monitored: number; latitude: number; feature: string | null }>
  assert.deepStrictEqual(
    predictions.map((prediction) => ({ ...prediction })),
    [
      { monitored: 1, latitude: 1.3701, feature: 'WAB' },
      { monitored: 0, latitude: 0, feature: null }
    ]
  )

  database.close()
})
