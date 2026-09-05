import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createLtaDataMallClient } from '../clients/lta-datamall.ts'
import { loadConfig } from '../config.ts'
import { collectService261Reference } from '../services/collect-service-261-reference.ts'

const outputPath = path.resolve('test', 'fixtures', 'lta', 'service-261-reference.json')

async function main(): Promise<void> {
  const config = loadConfig()
  const client = createLtaDataMallClient({ apiKey: config.ltaDatamallKey })
  const snapshot = await collectService261Reference(client)
  const temporaryOutputPath = `${outputPath}.tmp`

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(temporaryOutputPath, `${JSON.stringify(snapshot, null, 2)}\n`)
  await rename(temporaryOutputPath, outputPath)

  console.log(
    `Wrote ${snapshot.routeStops.length} route rows and ${snapshot.busStops.length} stops`
  )
  console.log(outputPath)
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Unable to sync service 261 reference data'
  )
  process.exitCode = 1
})
