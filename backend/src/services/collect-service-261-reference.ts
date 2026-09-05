import { type LtaDataMallClient } from '../clients/lta-datamall.ts'

const pageSize = 500
const maxRoutePages = 100

type LtaCollectionResponse = {
  value: unknown[]
}

export type Service261ReferenceSnapshot = {
  schemaVersion: 1
  fetchedAt: string
  routePageCount: number
  service: unknown[]
  routeStops: unknown[]
  busStops: unknown[]
}

function getCollection(response: unknown, endpoint: string): LtaCollectionResponse {
  if (
    typeof response === 'object' &&
    response !== null &&
    'value' in response &&
    Array.isArray(response.value)
  ) {
    return { value: response.value }
  }

  throw new Error(`LTA DataMall ${endpoint} response did not contain a value array`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getStringProperty(value: unknown, property: string): string | undefined {
  if (!isRecord(value) || !(property in value)) {
    return undefined
  }

  const propertyValue = value[property]
  return typeof propertyValue === 'string' ? propertyValue : undefined
}

export async function collectService261Reference(
  client: LtaDataMallClient,
  fetchedAt = new Date().toISOString()
): Promise<Service261ReferenceSnapshot> {
  const routeStops: unknown[] = []
  let routePageCount = 0

  for (let skip = 0; skip < pageSize * maxRoutePages; skip += pageSize) {
    const page = getCollection(await client.get('BusRoutes', { $skip: skip }), 'BusRoutes')
    routePageCount += 1

    for (const routeStop of page.value) {
      if (getStringProperty(routeStop, 'ServiceNo') === '261') {
        routeStops.push(routeStop)
      }
    }

    if (page.value.length < pageSize) {
      break
    }

    if (routePageCount === maxRoutePages) {
      throw new Error(`BusRoutes exceeded the ${maxRoutePages}-page safety limit`)
    }
  }

  if (routeStops.length === 0) {
    throw new Error('BusRoutes did not contain service 261')
  }

  const service = getCollection(
    await client.get('BusServices', { ServiceNo: '261' }),
    'BusServices'
  ).value

  if (service.length === 0) {
    throw new Error('BusServices did not contain service 261')
  }

  const stopCodes = [
    ...new Set(
      routeStops
        .map((routeStop) => getStringProperty(routeStop, 'BusStopCode'))
        .filter((busStopCode): busStopCode is string => busStopCode !== undefined)
    )
  ]

  if (stopCodes.length === 0) {
    throw new Error('Service 261 route data did not contain bus stop codes')
  }

  const busStops: unknown[] = []
  for (const busStopCode of stopCodes) {
    const stops = getCollection(
      await client.get('BusStops', { BusStopCode: busStopCode }),
      'BusStops'
    ).value
    busStops.push(...stops)
  }

  return {
    schemaVersion: 1,
    fetchedAt,
    routePageCount,
    service,
    routeStops,
    busStops
  }
}
