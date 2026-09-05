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
  },
  {
    id: '003_arrival_observations',
    sql: `
      CREATE TABLE arrival_poll_runs (
        id INTEGER PRIMARY KEY,
        service_no TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        requested_stop_count INTEGER NOT NULL,
        successful_stop_count INTEGER NOT NULL DEFAULT 0,
        failed_stop_count INTEGER NOT NULL DEFAULT 0,
        CHECK (successful_stop_count >= 0),
        CHECK (failed_stop_count >= 0)
      );

      CREATE TABLE arrival_polls (
        id INTEGER PRIMARY KEY,
        poll_run_id INTEGER NOT NULL REFERENCES arrival_poll_runs (id) ON DELETE CASCADE,
        bus_stop_code TEXT NOT NULL REFERENCES bus_stops (bus_stop_code),
        collected_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        outcome TEXT NOT NULL CHECK (outcome IN ('success', 'invalid_response', 'request_failed')),
        error_message TEXT,
        raw_response TEXT,
        UNIQUE (poll_run_id, bus_stop_code),
        CHECK (duration_ms >= 0)
      );

      CREATE INDEX arrival_polls_by_stop_and_time
        ON arrival_polls (bus_stop_code, collected_at);

      CREATE TABLE arrival_predictions (
        id INTEGER PRIMARY KEY,
        arrival_poll_id INTEGER NOT NULL REFERENCES arrival_polls (id) ON DELETE CASCADE,
        service_no TEXT NOT NULL,
        queue_position INTEGER NOT NULL CHECK (queue_position BETWEEN 1 AND 3),
        estimated_arrival TEXT NOT NULL,
        monitored INTEGER NOT NULL CHECK (monitored IN (0, 1)),
        origin_code TEXT,
        destination_code TEXT,
        latitude REAL,
        longitude REAL,
        visit_number INTEGER,
        load TEXT,
        feature TEXT,
        vehicle_type TEXT,
        UNIQUE (arrival_poll_id, queue_position)
      );

      CREATE INDEX arrival_predictions_by_service_and_eta
        ON arrival_predictions (service_no, estimated_arrival);
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
