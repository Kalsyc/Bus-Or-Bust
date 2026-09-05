import * as assert from 'node:assert'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'

import { runMigrations } from '../../src/database/migrations.ts'

test('migrations are recorded and can run more than once', () => {
  const database = new DatabaseSync(':memory:')

  runMigrations(database)
  runMigrations(database)

  const migrations = database.prepare('SELECT id FROM schema_migrations').all() as Array<{
    id: string
  }>
  assert.deepStrictEqual(
    migrations.map(({ id }) => id),
    ['001_migration_tracking', '002_service_reference_data']
  )

  database.close()
})
