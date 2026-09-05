import { type DatabaseSync } from 'node:sqlite'

type Migration = {
  id: string
  sql: string
}

const migrations: readonly Migration[] = [
  {
    id: '001_migration_tracking',
    sql: ''
  },
  {
    id: '002_service_reference_data',
    sql: `
      CREATE TABLE bus_services (
        service_no TEXT NOT NULL,
        direction INTEGER NOT NULL,
        operator TEXT NOT NULL,
        category TEXT NOT NULL,
        origin_code TEXT NOT NULL,
        destination_code TEXT NOT NULL,
        am_peak_frequency TEXT NOT NULL,
        am_offpeak_frequency TEXT NOT NULL,
        pm_peak_frequency TEXT NOT NULL,
        pm_offpeak_frequency TEXT NOT NULL,
        loop_description TEXT NOT NULL,
        PRIMARY KEY (service_no, direction)
      );

      CREATE TABLE bus_stops (
        bus_stop_code TEXT PRIMARY KEY,
        road_name TEXT NOT NULL,
        description TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL
      );

      CREATE TABLE service_stops (
        service_no TEXT NOT NULL,
        direction INTEGER NOT NULL,
        stop_sequence INTEGER NOT NULL,
        bus_stop_code TEXT NOT NULL,
        operator TEXT NOT NULL,
        distance_km REAL NOT NULL,
        weekday_first_bus TEXT NOT NULL,
        weekday_last_bus TEXT NOT NULL,
        saturday_first_bus TEXT NOT NULL,
        saturday_last_bus TEXT NOT NULL,
        sunday_first_bus TEXT NOT NULL,
        sunday_last_bus TEXT NOT NULL,
        PRIMARY KEY (service_no, direction, stop_sequence),
        FOREIGN KEY (service_no, direction)
          REFERENCES bus_services (service_no, direction),
        FOREIGN KEY (bus_stop_code) REFERENCES bus_stops (bus_stop_code)
      );

      CREATE INDEX service_stops_by_stop_code ON service_stops (bus_stop_code);

      CREATE TABLE reference_sync_runs (
        id INTEGER PRIMARY KEY,
        service_no TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        route_page_count INTEGER NOT NULL,
        imported_at TEXT NOT NULL
      );
    `
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
