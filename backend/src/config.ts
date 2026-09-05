import 'dotenv/config'
import path from 'node:path'

export type AppConfig = {
  databasePath: string
  ltaDatamallKey?: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const configuredDatabasePath = env.DATABASE_PATH?.trim()
  const configuredLtaDatamallKey = env.LTA_DATAMALL_KEY?.trim()

  if (env.DATABASE_PATH !== undefined && configuredDatabasePath === '') {
    throw new Error('DATABASE_PATH must not be empty')
  }

  if (env.LTA_DATAMALL_KEY !== undefined && configuredLtaDatamallKey === '') {
    throw new Error('LTA_DATAMALL_KEY must not be empty')
  }

  const config: AppConfig = {
    databasePath: configuredDatabasePath ?? path.resolve('data', 'bus-or-bust.sqlite')
  }

  if (configuredLtaDatamallKey !== undefined) {
    config.ltaDatamallKey = configuredLtaDatamallKey
  }

  return config
}
