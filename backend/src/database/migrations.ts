import { type DatabaseSync } from 'node:sqlite'

type Migration = {
  id: string
  sql: string
}

const migrations: readonly Migration[] = [
  {
    id: '001_migration_tracking',
    sql: ''
  }
]

export function runMigrations(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `)

  const appliedMigrations = new Set(
    (database.prepare('SELECT id FROM schema_migrations').all() as Array<{ id: string }>).map(
      ({ id }) => id
    )
  )
  const insertMigration = database.prepare(
    'INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)'
  )

  database.exec('BEGIN')
  try {
    for (const migration of migrations) {
      if (appliedMigrations.has(migration.id)) {
        continue
      }

      if (migration.sql !== '') {
        database.exec(migration.sql)
      }
      insertMigration.run(migration.id, new Date().toISOString())
    }
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}
