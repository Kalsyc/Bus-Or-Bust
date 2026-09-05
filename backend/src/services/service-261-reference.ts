import { readFile } from 'node:fs/promises'
import { type DatabaseSync } from 'node:sqlite'

export type Service261Reference = {
  schemaVersion: 1
  fetchedAt: string
  routePageCount: number
  service: ServiceReference[]
  routeStops: RouteStopReference[]
  busStops: BusStopReference[]
}

type ServiceReference = {
  ServiceNo: '261'
  Operator: string
  Direction: number
  Category: string
  OriginCode: string
  DestinationCode: string
  AM_Peak_Freq: string
  AM_Offpeak_Freq: string
  PM_Peak_Freq: string
  PM_Offpeak_Freq: string
  LoopDesc: string
}

type RouteStopReference = {
  ServiceNo: '261'
  Operator: string
  Direction: number
  StopSequence: number
  BusStopCode: string
  Distance: number
  WD_FirstBus: string
  WD_LastBus: string
  SAT_FirstBus: string
  SAT_LastBus: string
  SUN_FirstBus: string
  SUN_LastBus: string
}

type BusStopReference = {
  BusStopCode: string
  RoadName: string
  Description: string
  Latitude: number
  Longitude: number
}

type RecordValue = Record<string, unknown>

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null
}

function getString(record: RecordValue, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value === '') {
    throw new Error(`Invalid reference data: ${key} must be a non-empty string`)
  }
  return value
}

function getNumber(record: RecordValue, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid reference data: ${key} must be a finite number`)
  }
  return value
}

function getArray(record: RecordValue, key: string): unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw new Error(`Invalid reference data: ${key} must be an array`)
  }
  return value
}

function parseService(value: unknown): ServiceReference {
  if (!isRecord(value) || getString(value, 'ServiceNo') !== '261') {
    throw new Error('Invalid reference data: expected a Service 261 record')
  }

  return {
    ServiceNo: '261',
    Operator: getString(value, 'Operator'),
    Direction: getNumber(value, 'Direction'),
    Category: getString(value, 'Category'),
    OriginCode: getString(value, 'OriginCode'),
    DestinationCode: getString(value, 'DestinationCode'),
    AM_Peak_Freq: getString(value, 'AM_Peak_Freq'),
    AM_Offpeak_Freq: getString(value, 'AM_Offpeak_Freq'),
    PM_Peak_Freq: getString(value, 'PM_Peak_Freq'),
    PM_Offpeak_Freq: getString(value, 'PM_Offpeak_Freq'),
    LoopDesc: getString(value, 'LoopDesc')
  }
}

function parseRouteStop(value: unknown): RouteStopReference {
  if (!isRecord(value) || getString(value, 'ServiceNo') !== '261') {
    throw new Error('Invalid reference data: expected a Service 261 route stop')
  }

  return {
    ServiceNo: '261',
    Operator: getString(value, 'Operator'),
    Direction: getNumber(value, 'Direction'),
    StopSequence: getNumber(value, 'StopSequence'),
    BusStopCode: getString(value, 'BusStopCode'),
    Distance: getNumber(value, 'Distance'),
    WD_FirstBus: getString(value, 'WD_FirstBus'),
    WD_LastBus: getString(value, 'WD_LastBus'),
    SAT_FirstBus: getString(value, 'SAT_FirstBus'),
    SAT_LastBus: getString(value, 'SAT_LastBus'),
    SUN_FirstBus: getString(value, 'SUN_FirstBus'),
    SUN_LastBus: getString(value, 'SUN_LastBus')
  }
}

function parseBusStop(value: unknown): BusStopReference {
  if (!isRecord(value)) {
    throw new Error('Invalid reference data: expected a bus stop record')
  }

  return {
    BusStopCode: getString(value, 'BusStopCode'),
    RoadName: getString(value, 'RoadName'),
    Description: getString(value, 'Description'),
    Latitude: getNumber(value, 'Latitude'),
    Longitude: getNumber(value, 'Longitude')
  }
}

export function parseService261Reference(value: unknown): Service261Reference {
  if (!isRecord(value) || getNumber(value, 'schemaVersion') !== 1) {
    throw new Error('Invalid reference data: unsupported schema version')
  }

  const reference = {
    schemaVersion: 1 as const,
    fetchedAt: getString(value, 'fetchedAt'),
    routePageCount: getNumber(value, 'routePageCount'),
    service: getArray(value, 'service').map(parseService),
    routeStops: getArray(value, 'routeStops').map(parseRouteStop),
    busStops: getArray(value, 'busStops').map(parseBusStop)
  }

  if (reference.service.length === 0 || reference.routeStops.length === 0) {
    throw new Error('Invalid reference data: service and route stops must not be empty')
  }

  return reference
}

export async function readService261Reference(filePath: string): Promise<Service261Reference> {
  const contents = await readFile(filePath, 'utf8')
  return parseService261Reference(JSON.parse(contents) as unknown)
}

export function importService261Reference(
  database: DatabaseSync,
  reference: Service261Reference,
  importedAt = new Date().toISOString()
): void {
  const busStopCodes = new Set(reference.busStops.map(({ BusStopCode }) => BusStopCode))
  for (const { BusStopCode } of reference.routeStops) {
    if (!busStopCodes.has(BusStopCode)) {
      throw new Error(`Invalid reference data: missing bus stop ${BusStopCode}`)
    }
  }

  const upsertService = database.prepare(`
    INSERT INTO bus_services (
      service_no, direction, operator, category, origin_code, destination_code,
      am_peak_frequency, am_offpeak_frequency, pm_peak_frequency, pm_offpeak_frequency,
      loop_description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(service_no, direction) DO UPDATE SET
      operator = excluded.operator,
      category = excluded.category,
      origin_code = excluded.origin_code,
      destination_code = excluded.destination_code,
      am_peak_frequency = excluded.am_peak_frequency,
      am_offpeak_frequency = excluded.am_offpeak_frequency,
      pm_peak_frequency = excluded.pm_peak_frequency,
      pm_offpeak_frequency = excluded.pm_offpeak_frequency,
      loop_description = excluded.loop_description
  `)
  const upsertBusStop = database.prepare(`
    INSERT INTO bus_stops (bus_stop_code, road_name, description, latitude, longitude)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(bus_stop_code) DO UPDATE SET
      road_name = excluded.road_name,
      description = excluded.description,
      latitude = excluded.latitude,
      longitude = excluded.longitude
  `)
  const insertRouteStop = database.prepare(`
    INSERT INTO service_stops (
      service_no, direction, stop_sequence, bus_stop_code, operator, distance_km,
      weekday_first_bus, weekday_last_bus, saturday_first_bus, saturday_last_bus,
      sunday_first_bus, sunday_last_bus
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const recordSync = database.prepare(`
    INSERT INTO reference_sync_runs (service_no, fetched_at, route_page_count, imported_at)
    VALUES (?, ?, ?, ?)
  `)

  database.exec('BEGIN IMMEDIATE')
  try {
    database.prepare('DELETE FROM service_stops WHERE service_no = ?').run('261')

    for (const service of reference.service) {
      upsertService.run(
        service.ServiceNo,
        service.Direction,
        service.Operator,
        service.Category,
        service.OriginCode,
        service.DestinationCode,
        service.AM_Peak_Freq,
        service.AM_Offpeak_Freq,
        service.PM_Peak_Freq,
        service.PM_Offpeak_Freq,
        service.LoopDesc
      )
    }

    for (const busStop of reference.busStops) {
      upsertBusStop.run(
        busStop.BusStopCode,
        busStop.RoadName,
        busStop.Description,
        busStop.Latitude,
        busStop.Longitude
      )
    }

    for (const routeStop of reference.routeStops) {
      insertRouteStop.run(
        routeStop.ServiceNo,
        routeStop.Direction,
        routeStop.StopSequence,
        routeStop.BusStopCode,
        routeStop.Operator,
        routeStop.Distance,
        routeStop.WD_FirstBus,
        routeStop.WD_LastBus,
        routeStop.SAT_FirstBus,
        routeStop.SAT_LastBus,
        routeStop.SUN_FirstBus,
        routeStop.SUN_LastBus
      )
    }

    recordSync.run('261', reference.fetchedAt, reference.routePageCount, importedAt)
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}
