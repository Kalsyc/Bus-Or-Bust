import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { loadConfig } from '../config.ts'
import { runMigrations } from '../database/migrations.ts'
import {
  importService261Reference,
  readService261Reference
} from '../services/service-261-reference.ts'

const fixturePath = path.resolve('test', 'fixtures', 'lta', 'service-261-reference.json')

async function main(): Promise<void> {
  const config = loadConfig()
  const reference = await readService261Reference(fixturePath)

  if (config.databasePath !== ':memory:') {
    mkdirSync(path.dirname(config.databasePath), { recursive: true })
  }

  const database = new DatabaseSync(config.databasePath)
  try {
    database.exec('PRAGMA foreign_keys = ON')
    runMigrations(database)
    importService261Reference(database, reference)
  } finally {
    database.close()
  }

  console.log(
    `Seeded ${reference.routeStops.length} Service 261 route rows into ${config.databasePath}`
  )
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Unable to seed Service 261 reference data'
  )
  process.exitCode = 1
})
