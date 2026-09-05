import { type FastifyPluginAsync } from 'fastify'

type ServiceParams = {
  serviceNo: string
}

type ServiceRow = {
  serviceNo: string
  direction: number
  operator: string
  category: string
  originCode: string
  destinationCode: string
  amPeakFrequency: string
  amOffpeakFrequency: string
  pmPeakFrequency: string
  pmOffpeakFrequency: string
  loopDescription: string
}

type StopRow = {
  direction: number
  stopSequence: number
  busStopCode: string
  distanceKm: number
  weekdayFirstBus: string
  weekdayLastBus: string
  saturdayFirstBus: string
  saturdayLastBus: string
  sundayFirstBus: string
  sundayLastBus: string
  roadName: string
  description: string
  latitude: number
  longitude: number
}

const serviceResponseSchema = {
  type: 'object',
  required: ['serviceNo', 'directions'],
  properties: {
    serviceNo: { type: 'string', example: '261' },
    directions: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'direction',
          'operator',
          'category',
          'originCode',
          'destinationCode',
          'frequencies',
          'loopDescription'
        ],
        properties: {
          direction: { type: 'integer', example: 1 },
          operator: { type: 'string', example: 'SBST' },
          category: { type: 'string', example: 'FEEDER' },
          originCode: { type: 'string', example: '54009' },
          destinationCode: { type: 'string', example: '54009' },
          frequencies: {
            type: 'object',
            required: ['amPeak', 'amOffpeak', 'pmPeak', 'pmOffpeak'],
            properties: {
              amPeak: { type: 'string', example: '03-05' },
              amOffpeak: { type: 'string', example: '05-07' },
              pmPeak: { type: 'string', example: '04-07' },
              pmOffpeak: { type: 'string', example: '05-09' }
            }
          },
          loopDescription: { type: 'string', example: 'Ang Mo Kio Ave 10' }
        }
      }
    }
  }
} as const

const services: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Params: ServiceParams }>(
    '/services/:serviceNo',
    {
      schema: {
        tags: ['Services'],
        summary: 'Get reference data for a bus service',
        params: {
          type: 'object',
          required: ['serviceNo'],
          properties: { serviceNo: { type: 'string' } }
        },
        response: { 200: serviceResponseSchema }
      }
    },
    async (request, reply) => {
      const rows = fastify.database
        .prepare(
          `
          SELECT
            service_no AS serviceNo, direction, operator, category,
            origin_code AS originCode, destination_code AS destinationCode,
            am_peak_frequency AS amPeakFrequency,
            am_offpeak_frequency AS amOffpeakFrequency,
            pm_peak_frequency AS pmPeakFrequency,
            pm_offpeak_frequency AS pmOffpeakFrequency,
            loop_description AS loopDescription
          FROM bus_services
          WHERE service_no = ?
          ORDER BY direction
        `
        )
        .all(request.params.serviceNo) as ServiceRow[]

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Bus service not found', statusCode: 404 })
      }

      return {
        serviceNo: request.params.serviceNo,
        directions: rows.map((row) => ({
          direction: row.direction,
          operator: row.operator,
          category: row.category,
          originCode: row.originCode,
          destinationCode: row.destinationCode,
          frequencies: {
            amPeak: row.amPeakFrequency,
            amOffpeak: row.amOffpeakFrequency,
            pmPeak: row.pmPeakFrequency,
            pmOffpeak: row.pmOffpeakFrequency
          },
          loopDescription: row.loopDescription
        }))
      }
    }
  )

  fastify.get<{ Params: ServiceParams }>(
    '/services/:serviceNo/stops',
    {
      schema: {
        tags: ['Services'],
        summary: 'List ordered stops for a bus service',
        description:
          'Each record represents a route visit; loop services can visit the same stop more than once.',
        params: {
          type: 'object',
          required: ['serviceNo'],
          properties: { serviceNo: { type: 'string' } }
        },
        response: {
          200: {
            type: 'object',
            required: ['serviceNo', 'stops'],
            properties: {
              serviceNo: { type: 'string', example: '261' },
              stops: {
                type: 'array',
                items: {
                  type: 'object',
                  required: [
                    'direction',
                    'stopSequence',
                    'busStopCode',
                    'distanceKm',
                    'operatingHours',
                    'name',
                    'location'
                  ],
                  properties: {
                    direction: { type: 'integer', example: 1 },
                    stopSequence: { type: 'integer', example: 1 },
                    busStopCode: { type: 'string', example: '54009' },
                    distanceKm: { type: 'number', example: 0 },
                    operatingHours: {
                      type: 'object',
                      required: ['weekday', 'saturday', 'sunday'],
                      properties: {
                        weekday: {
                          type: 'object',
                          required: ['firstBus', 'lastBus'],
                          properties: {
                            firstBus: { type: 'string', example: '0510' },
                            lastBus: { type: 'string', example: '0105' }
                          }
                        },
                        saturday: {
                          type: 'object',
                          required: ['firstBus', 'lastBus'],
                          properties: {
                            firstBus: { type: 'string', example: '0510' },
                            lastBus: { type: 'string', example: '0105' }
                          }
                        },
                        sunday: {
                          type: 'object',
                          required: ['firstBus', 'lastBus'],
                          properties: {
                            firstBus: { type: 'string', example: '0510' },
                            lastBus: { type: 'string', example: '0105' }
                          }
                        }
                      }
                    },
                    name: { type: 'string', example: 'Ang Mo Kio Int' },
                    roadName: { type: 'string', example: 'Ang Mo Kio Ave 8' },
                    location: {
                      type: 'object',
                      required: ['latitude', 'longitude'],
                      properties: {
                        latitude: { type: 'number', example: 1.36968769913339 },
                        longitude: { type: 'number', example: 103.84856716193268 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const rows = fastify.database
        .prepare(
          `
          SELECT
            service_stops.direction,
            service_stops.stop_sequence AS stopSequence,
            service_stops.bus_stop_code AS busStopCode,
            service_stops.distance_km AS distanceKm,
            service_stops.weekday_first_bus AS weekdayFirstBus,
            service_stops.weekday_last_bus AS weekdayLastBus,
            service_stops.saturday_first_bus AS saturdayFirstBus,
            service_stops.saturday_last_bus AS saturdayLastBus,
            service_stops.sunday_first_bus AS sundayFirstBus,
            service_stops.sunday_last_bus AS sundayLastBus,
            bus_stops.road_name AS roadName,
            bus_stops.description,
            bus_stops.latitude,
            bus_stops.longitude
          FROM service_stops
          INNER JOIN bus_stops ON bus_stops.bus_stop_code = service_stops.bus_stop_code
          WHERE service_stops.service_no = ?
          ORDER BY service_stops.direction, service_stops.stop_sequence
        `
        )
        .all(request.params.serviceNo) as StopRow[]

      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Bus service not found', statusCode: 404 })
      }

      return {
        serviceNo: request.params.serviceNo,
        stops: rows.map((row) => ({
          direction: row.direction,
          stopSequence: row.stopSequence,
          busStopCode: row.busStopCode,
          distanceKm: row.distanceKm,
          operatingHours: {
            weekday: { firstBus: row.weekdayFirstBus, lastBus: row.weekdayLastBus },
            saturday: { firstBus: row.saturdayFirstBus, lastBus: row.saturdayLastBus },
            sunday: { firstBus: row.sundayFirstBus, lastBus: row.sundayLastBus }
          },
          name: row.description,
          roadName: row.roadName,
          location: { latitude: row.latitude, longitude: row.longitude }
        }))
      }
    }
  )
}

export default services
