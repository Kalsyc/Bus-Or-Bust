import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { createLtaDataMallClient } from '../clients/lta-datamall.ts'
import { loadConfig } from '../config.ts'
import { runMigrations } from '../database/migrations.ts'
import { collectService261ArrivalObservations } from '../services/collect-service-261-arrivals.ts'

async function main(): Promise<void> {
  const config = loadConfig()
  if (config.ltaDatamallKey === undefined) {
    throw new Error('LTA_DATAMALL_KEY is required to collect Service 261 arrival observations')
  }

  if (config.databasePath !== ':memory:') {
    mkdirSync(path.dirname(config.databasePath), { recursive: true })
  }

  const database = new DatabaseSync(config.databasePath)
  try {
    database.exec('PRAGMA foreign_keys = ON')
    runMigrations(database)

    const result = await collectService261ArrivalObservations(
      database,
      createLtaDataMallClient({ apiKey: config.ltaDatamallKey })
    )
    console.log(
      `Recorded ${result.predictionCount} Service 261 arrival predictions from ` +
        `${result.successfulStopCount}/${result.requestedStopCount} successful stop polls ` +
        `(run ${result.pollRunId}).`
    )
  } finally {
    database.close()
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Unable to collect Service 261 arrival observations'
  )
  process.exitCode = 1
})
