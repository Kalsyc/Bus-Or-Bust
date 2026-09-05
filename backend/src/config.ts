import path from 'node:path'

export type AppConfig = {
  databasePath: string
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const configuredDatabasePath = env.DATABASE_PATH?.trim()

  if (env.DATABASE_PATH !== undefined && configuredDatabasePath === '') {
    throw new Error('DATABASE_PATH must not be empty')
  }

  return {
    databasePath: configuredDatabasePath ?? path.resolve('data', 'bus-or-bust.sqlite')
  }
}
