import fp from 'fastify-plugin'

import { createLtaDataMallClient, type LtaDataMallClient } from '../clients/lta-datamall.ts'
import { loadConfig } from '../config.ts'

export default fp(async (fastify) => {
  const config = loadConfig()

  fastify.decorate('ltaDataMall', createLtaDataMallClient({ apiKey: config.ltaDatamallKey }))
  fastify.log.info(
    { ltaDataMallConfigured: config.ltaDatamallKey !== undefined },
    'LTA DataMall client configured'
  )
})

declare module 'fastify' {
  interface FastifyInstance {
    ltaDataMall: LtaDataMallClient
  }
}
