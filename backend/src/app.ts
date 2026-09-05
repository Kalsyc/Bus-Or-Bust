import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { type FastifyPluginAsync } from 'fastify'

import databasePlugin from './plugins/database.ts'
import ltaDataMallPlugin from './plugins/lta-datamall.ts'
import databaseHealthRoute from './routes/database-health.ts'
import ltaDataMallRoute from './routes/lta-datamall.ts'
import rootRoute from './routes/root.ts'
import servicesRoute from './routes/services.ts'

export type AppOptions = {
  databasePath?: string
}

function getClientStatusCode(error: unknown): number {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  ) {
    return error.statusCode
  }

  return 500
}

function getErrorDetail(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }

  return { name: 'Error', message: 'An unexpected error occurred' }
}

// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {}

const app: FastifyPluginAsync<AppOptions> = async (fastify, opts): Promise<void> => {
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = getClientStatusCode(error)
    const detail = getErrorDetail(error)

    fastify.log.error({ err: error, requestId: request.id }, 'Request failed')

    return reply.status(statusCode).send({
      error: statusCode === 500 ? 'Internal Server Error' : detail.name,
      message: statusCode === 500 ? 'An unexpected error occurred' : detail.message,
      statusCode
    })
  })

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Bus or Bust API',
        description: 'Bus arrival reliability data for Singapore bus services.',
        version: '0.1.0'
      }
    }
  })

  await fastify.register(databasePlugin, opts)
  await fastify.register(ltaDataMallPlugin)
  await fastify.register(rootRoute)
  await fastify.register(databaseHealthRoute)
  await fastify.register(ltaDataMallRoute)
  await fastify.register(servicesRoute)

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  })
}

export default app
export { app, options }
