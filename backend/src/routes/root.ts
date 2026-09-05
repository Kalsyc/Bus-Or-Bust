import { type FastifyPluginAsync } from 'fastify'

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get(
    '/',
    {
      schema: {
        tags: ['System'],
        summary: 'Verify that the API is running',
        response: {
          200: {
            type: 'object',
            required: ['name', 'status'],
            properties: {
              name: { type: 'string', example: 'bus-or-bust-api' },
              status: { type: 'string', example: 'ok' }
            }
          }
        }
      }
    },
    async () => {
      return { name: 'bus-or-bust-api', status: 'ok' }
    }
  )
}

export default root
