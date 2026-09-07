import type { Service261Data, ServiceDirection, ServiceStop } from '#lib/types/service.ts'

export type { Service261Data, ServiceDirection, ServiceStop } from '#lib/types/service.ts'

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isOperatingHours(value: unknown): value is ServiceStop['operatingHours'] {
  if (!isObject(value)) {
    return false
  }

  return ['weekday', 'saturday', 'sunday'].every((day) => {
    const hours = value[day]
    return isObject(hours) && isString(hours.firstBus) && isString(hours.lastBus)
  })
}

function isServiceDirection(value: unknown): value is ServiceDirection {
  if (!isObject(value) || !isObject(value.frequencies)) {
    return false
  }

  return (
    isNumber(value.direction) &&
    isString(value.operator) &&
    isString(value.category) &&
    isString(value.originCode) &&
    isString(value.destinationCode) &&
    isString(value.frequencies.amPeak) &&
    isString(value.frequencies.amOffpeak) &&
    isString(value.frequencies.pmPeak) &&
    isString(value.frequencies.pmOffpeak) &&
    isString(value.loopDescription)
  )
}

function isServiceStop(value: unknown): value is ServiceStop {
  if (!isObject(value) || !isObject(value.location)) {
    return false
  }

  return (
    isNumber(value.direction) &&
    isNumber(value.stopSequence) &&
    isString(value.busStopCode) &&
    isNumber(value.distanceKm) &&
    isString(value.name) &&
    isString(value.roadName) &&
    isNumber(value.location.latitude) &&
    isNumber(value.location.longitude) &&
    isOperatingHours(value.operatingHours)
  )
}

function backendUrl(): string {
  return (process.env.BACKEND_URL?.trim() || 'http://localhost:3000').replace(/\/$/, '')
}

async function fetchJson(fetcher: typeof fetch, url: string): Promise<unknown> {
  const response = await fetcher(url)

  if (!response.ok) {
    throw new Error(`The backend returned ${response.status}.`)
  }

  return response.json()
}

export async function fetchService261(fetcher: typeof fetch): Promise<Service261Data> {
  const apiUrl = backendUrl()
  const [servicePayload, stopsPayload] = await Promise.all([
    fetchJson(fetcher, `${apiUrl}/services/261`),
    fetchJson(fetcher, `${apiUrl}/services/261/stops`)
  ])

  if (
    !isObject(servicePayload) ||
    servicePayload.serviceNo !== '261' ||
    !Array.isArray(servicePayload.directions) ||
    !servicePayload.directions.every(isServiceDirection) ||
    !isObject(stopsPayload) ||
    stopsPayload.serviceNo !== '261' ||
    !Array.isArray(stopsPayload.stops) ||
    !stopsPayload.stops.every(isServiceStop)
  ) {
    throw new Error('The backend returned an unexpected Service 261 response.')
  }

  return {
    serviceNo: servicePayload.serviceNo,
    directions: servicePayload.directions,
    stops: stopsPayload.stops
  }
}
