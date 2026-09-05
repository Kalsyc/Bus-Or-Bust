import { type DatabaseSync } from 'node:sqlite'

import { type LtaDataMallClient } from '../clients/lta-datamall.ts'

type RecordValue = Record<string, unknown>

type ArrivalPrediction = {
  queuePosition: 1 | 2 | 3
  estimatedArrival: string
  monitored: 0 | 1
  originCode: string | null
  destinationCode: string | null
  latitude: number | null
  longitude: number | null
  visitNumber: number | null
  load: string | null
  feature: string | null
  vehicleType: string | null
}

type ArrivalPollResult = {
  busStopCode: string
  collectedAt: string
  durationMs: number
  outcome: 'success' | 'invalid_response' | 'request_failed'
  errorMessage: string | null
  rawResponse: string | null
  predictions: ArrivalPrediction[]
}

export type Service261ArrivalCollection = {
  pollRunId: number
  requestedStopCount: number
  successfulStopCount: number
  failedStopCount: number
  predictionCount: number
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null
}

function optionalString(record: RecordValue, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' && value !== '' ? value : null
}

function optionalFiniteNumber(record: RecordValue, key: string): number | null {
  const value = optionalString(record, key)
  if (value === null) {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function optionalPositiveInteger(record: RecordValue, key: string): number | null {
  const value = optionalString(record, key)
  if (value === null) {
    return null
  }

  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : null
}

function parsePrediction(value: unknown, queuePosition: 1 | 2 | 3): ArrivalPrediction | null {
  if (!isRecord(value)) {
    return null
  }

  const estimatedArrival = optionalString(value, 'EstimatedArrival')
  if (estimatedArrival === null) {
    return null
  }
  if (Number.isNaN(Date.parse(estimatedArrival))) {
    throw new Error('EstimatedArrival must be an ISO date-time')
  }

  const monitoredValue = value.Monitored
  if (monitoredValue !== 0 && monitoredValue !== 1) {
    throw new Error('Monitored must be 0 or 1')
  }

  return {
    queuePosition,
    estimatedArrival,
    monitored: monitoredValue,
    originCode: optionalString(value, 'OriginCode'),
    destinationCode: optionalString(value, 'DestinationCode'),
    latitude: optionalFiniteNumber(value, 'Latitude'),
    longitude: optionalFiniteNumber(value, 'Longitude'),
    visitNumber: optionalPositiveInteger(value, 'VisitNumber'),
    load: optionalString(value, 'Load'),
    feature: optionalString(value, 'Feature'),
    vehicleType: optionalString(value, 'Type')
  }
}

export function parseService261ArrivalPredictions(value: unknown): ArrivalPrediction[] {
  if (!isRecord(value) || !Array.isArray(value.Services)) {
    throw new Error('Bus Arrival response must contain a Services array')
  }

  const service = value.Services.find(
    (candidate): candidate is RecordValue => isRecord(candidate) && candidate.ServiceNo === '261'
  )
  if (service === undefined) {
    return []
  }

  return [
    parsePrediction(service.NextBus, 1),
    parsePrediction(service.NextBus2, 2),
    parsePrediction(service.NextBus3, 3)
  ].filter((prediction): prediction is ArrivalPrediction => prediction !== null)
}

async function collectStop(
  client: LtaDataMallClient,
  busStopCode: string
): Promise<ArrivalPollResult> {
  const startedAt = Date.now()
  const collectedAt = new Date().toISOString()

  try {
    const response = await client.get('v3/BusArrival', {
      BusStopCode: busStopCode,
      ServiceNo: '261'
    })
    const rawResponse = JSON.stringify(response)

    try {
      return {
        busStopCode,
        collectedAt,
        durationMs: Date.now() - startedAt,
        outcome: 'success',
        errorMessage: null,
        rawResponse,
        predictions: parseService261ArrivalPredictions(response)
      }
    } catch (error) {
      return {
        busStopCode,
        collectedAt,
        durationMs: Date.now() - startedAt,
        outcome: 'invalid_response',
        errorMessage:
          error instanceof Error ? error.message : 'Unable to parse Bus Arrival response',
        rawResponse,
        predictions: []
      }
    }
  } catch (error) {
    return {
      busStopCode,
      collectedAt,
      durationMs: Date.now() - startedAt,
      outcome: 'request_failed',
      errorMessage: error instanceof Error ? error.message : 'Bus Arrival request failed',
      rawResponse: null,
      predictions: []
    }
  }
}

async function collectWithConcurrency<T, R>(
  values: readonly T[],
  limit: number,
  collect: (value: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      const value = values[currentIndex]
      if (value !== undefined) {
        results[currentIndex] = await collect(value)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, () => worker()))
  return results
}

export async function collectService261ArrivalObservations(
  database: DatabaseSync,
  client: LtaDataMallClient,
  concurrency = 3
): Promise<Service261ArrivalCollection> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error('Concurrency must be a positive integer')
  }

  const busStopCodes = (
    database
      .prepare(
        `
        SELECT DISTINCT bus_stop_code AS busStopCode
        FROM service_stops
        WHERE service_no = ?
        ORDER BY bus_stop_code
      `
      )
      .all('261') as Array<{ busStopCode: string }>
  ).map(({ busStopCode }) => busStopCode)

  if (busStopCodes.length === 0) {
    throw new Error('No Service 261 reference data found; run npm run seed:261 first')
  }

  const startedAt = new Date().toISOString()
  const createRun = database.prepare(`
    INSERT INTO arrival_poll_runs (service_no, started_at, requested_stop_count)
    VALUES (?, ?, ?)
  `)
  const pollRunId = Number(createRun.run('261', startedAt, busStopCodes.length).lastInsertRowid)
  const results = await collectWithConcurrency(busStopCodes, concurrency, (busStopCode) =>
    collectStop(client, busStopCode)
  )
  const successfulStopCount = results.filter(({ outcome }) => outcome === 'success').length
  const failedStopCount = results.length - successfulStopCount
  const predictionCount = results.reduce((total, { predictions }) => total + predictions.length, 0)

  const insertPoll = database.prepare(`
    INSERT INTO arrival_polls (
      poll_run_id, bus_stop_code, collected_at, duration_ms, outcome, error_message, raw_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const insertPrediction = database.prepare(`
    INSERT INTO arrival_predictions (
      arrival_poll_id, service_no, queue_position, estimated_arrival, monitored,
      origin_code, destination_code, latitude, longitude, visit_number, load, feature, vehicle_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const completeRun = database.prepare(`
    UPDATE arrival_poll_runs
    SET completed_at = ?, successful_stop_count = ?, failed_stop_count = ?
    WHERE id = ?
  `)

  database.exec('BEGIN IMMEDIATE')
  try {
    for (const result of results) {
      const arrivalPollId = Number(
        insertPoll.run(
          pollRunId,
          result.busStopCode,
          result.collectedAt,
          result.durationMs,
          result.outcome,
          result.errorMessage,
          result.rawResponse
        ).lastInsertRowid
      )

      for (const prediction of result.predictions) {
        insertPrediction.run(
          arrivalPollId,
          '261',
          prediction.queuePosition,
          prediction.estimatedArrival,
          prediction.monitored,
          prediction.originCode,
          prediction.destinationCode,
          prediction.latitude,
          prediction.longitude,
          prediction.visitNumber,
          prediction.load,
          prediction.feature,
          prediction.vehicleType
        )
      }
    }

    completeRun.run(new Date().toISOString(), successfulStopCount, failedStopCount, pollRunId)
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }

  return {
    pollRunId,
    requestedStopCount: busStopCodes.length,
    successfulStopCount,
    failedStopCount,
    predictionCount
  }
}
