import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import fp from 'fastify-plugin'

import { loadConfig } from '../config.ts'
import { runMigrations } from '../database/migrations.ts'

type DatabasePluginOptions = {
  databasePath?: string
}

export default fp<DatabasePluginOptions>(async (fastify, options: DatabasePluginOptions) => {
  const config = loadConfig()
  const databasePath = options.databasePath ?? config.databasePath

  if (databasePath !== ':memory:') {
    mkdirSync(path.dirname(databasePath), { recursive: true })
  }

  const database = new DatabaseSync(databasePath)
  database.exec('PRAGMA foreign_keys = ON')
  runMigrations(database)

  fastify.decorate('database', database)
  fastify.log.info({ databasePath }, 'SQLite database connected')
  fastify.addHook('onClose', () => {
    database.close()
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    database: DatabaseSync
  }
}
