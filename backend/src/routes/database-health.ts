import { type FastifyPluginAsync } from 'fastify'

const databaseHealth: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get(
    '/database/health',
    {
      schema: {
        tags: ['System'],
        summary: 'Verify the SQLite database connection',
        response: {
          200: {
            type: 'object',
            required: ['database', 'version'],
            properties: {
              database: { type: 'string', example: 'ok' },
              version: { type: 'string', example: '3.51.0' }
            }
          }
        }
      }
    },
    async () => {
      const row = fastify.database.prepare('SELECT sqlite_version() AS version').get() as {
        version: string
      }

      return { database: 'ok', version: row.version }
    }
  )
}

export default databaseHealth
