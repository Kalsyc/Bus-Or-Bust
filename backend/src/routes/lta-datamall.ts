import { type FastifyPluginAsync } from 'fastify'

const rawLtaResponseSchema = {
  type: 'object',
  additionalProperties: true
} as const

type ServiceParams = { serviceNo: string }
type BusStopParams = { busStopCode: string }
type ArrivalQuery = { serviceNo?: string }
type SkipQuery = { skip?: number }
type PassengerVolumeQuery = { date?: string }

const ltaDataMall: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get<{ Params: ServiceParams }>(
    '/lta/bus-services/:serviceNo',
    {
      schema: {
        tags: ['LTA DataMall'],
        summary: 'Inspect the live Bus Services response for one service',
        params: {
          type: 'object',
          required: ['serviceNo'],
          properties: { serviceNo: { type: 'string' } }
        },
        response: { 200: rawLtaResponseSchema }
      }
    },
    async (request) => {
      return fastify.ltaDataMall.get('BusServices', { ServiceNo: request.params.serviceNo })
    }
  )

  fastify.get<{ Params: BusStopParams }>(
    '/lta/bus-stops/:busStopCode',
    {
      schema: {
        tags: ['LTA DataMall'],
        summary: 'Inspect the live Bus Stops response for one stop',
        params: {
          type: 'object',
          required: ['busStopCode'],
          properties: { busStopCode: { type: 'string' } }
        },
        response: { 200: rawLtaResponseSchema }
      }
    },
    async (request) => {
      return fastify.ltaDataMall.get('BusStops', { BusStopCode: request.params.busStopCode })
    }
  )

  fastify.get<{ Params: BusStopParams; Querystring: ArrivalQuery }>(
    '/lta/bus-arrivals/:busStopCode',
    {
      schema: {
        tags: ['LTA DataMall'],
        summary: 'Inspect live Bus Arrival v3 data at one stop',
        params: {
          type: 'object',
          required: ['busStopCode'],
          properties: { busStopCode: { type: 'string' } }
        },
        querystring: {
          type: 'object',
          properties: { serviceNo: { type: 'string' } }
        },
        response: { 200: rawLtaResponseSchema }
      }
    },
    async (request) => {
      return fastify.ltaDataMall.get('v3/BusArrival', {
        BusStopCode: request.params.busStopCode,
        ServiceNo: request.query.serviceNo
      })
    }
  )

  fastify.get<{ Querystring: SkipQuery }>(
    '/lta/bus-routes',
    {
      schema: {
        tags: ['LTA DataMall'],
        summary: 'Inspect one paginated Bus Routes response',
        description: 'Use skip in steps of 500. Filter service 261 after collecting route pages.',
        querystring: {
          type: 'object',
          properties: { skip: { type: 'integer', minimum: 0 } }
        },
        response: { 200: rawLtaResponseSchema }
      }
    },
    async (request) => {
      return fastify.ltaDataMall.get('BusRoutes', { $skip: request.query.skip })
    }
  )

  fastify.get<{ Querystring: PassengerVolumeQuery }>(
    '/lta/passenger-volumes/bus',
    {
      schema: {
        tags: ['LTA DataMall'],
        summary: 'Inspect the Bus Stop passenger-volume download link response',
        querystring: {
          type: 'object',
          properties: { date: { type: 'string', pattern: '^\\d{6}$' } }
        },
        response: { 200: rawLtaResponseSchema }
      }
    },
    async (request) => {
      return fastify.ltaDataMall.get('PV/Bus', { Date: request.query.date })
    }
  )

  fastify.get<{ Querystring: PassengerVolumeQuery }>(
    '/lta/passenger-volumes/origin-destination-bus',
    {
      schema: {
        tags: ['LTA DataMall'],
        summary: 'Inspect the origin-destination Bus passenger-volume download link response',
        querystring: {
          type: 'object',
          properties: { date: { type: 'string', pattern: '^\\d{6}$' } }
        },
        response: { 200: rawLtaResponseSchema }
      }
    },
    async (request) => {
      return fastify.ltaDataMall.get('PV/ODBus', { Date: request.query.date })
    }
  )
}

export default ltaDataMall
