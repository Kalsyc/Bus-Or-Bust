# Bus or Bust backend

Local Fastify API with a SQLite database.

## Available Scripts

In the project directory, you can run:

### `npm run dev`

To start the app in dev mode.\
Open [http://localhost:3000](http://localhost:3000). The root endpoint confirms the API
is running; `/database/health` also executes a SQLite query.

Interactive OpenAPI documentation is available at
[http://localhost:3000/docs](http://localhost:3000/docs). The generated OpenAPI document
is also available as JSON at `/docs/json` and YAML at `/docs/yaml`.

When `LTA_DATAMALL_KEY` is configured, the `/lta/*` inspection routes call DataMall directly.
They are for local payload discovery only and do not persist data.

## Service 261 reference snapshot

Run `npm run sync:261` to retrieve all paginated Bus Routes data, select service 261, and
fetch its Bus Services and Bus Stops records. The command writes a reviewable test fixture to
`test/fixtures/lta/service-261-reference.json`; it does not write SQLite data.

Run `npm run seed:261` to validate that fixture and import it into the configured SQLite
database. The operation is transactional and can be safely rerun. It records a sync run and
preserves both visits to a stop on loop services.

After seeding, the local API exposes:

- `GET /services/261` for service-level reference data.
- `GET /services/261/stops` for ordered route stops, operating hours, and stop coordinates.

### `npm start`

Start the compiled application.

### `npm run test`

Run the test cases.

## Local database

By default, the server creates `data/bus-or-bust.sqlite` relative to the `backend`
directory. Override that location with `DATABASE_PATH` when needed.

## Database schema

The database currently holds **reference data**: the relatively stable description of a bus
service and its stops. It intentionally does not yet store real-time Bus Arrival observations.

```text
bus_services (one row per service direction)
    └── service_stops (one row per ordered visit to a stop)
              └── bus_stops (shared details for each physical stop)

reference_sync_runs (audit log of each fixture import)
schema_migrations    (internal migration history)
```

### `bus_services`

One record describes a service in one direction. Its composite primary key is
`(service_no, direction)`; this accommodates services that operate in both directions.

| Column                                                                                   | Type      | Meaning                                       |
| ---------------------------------------------------------------------------------------- | --------- | --------------------------------------------- |
| `service_no`                                                                             | `TEXT`    | Public service number, e.g. `261`.            |
| `direction`                                                                              | `INTEGER` | LTA direction number, e.g. `1`.               |
| `operator`, `category`                                                                   | `TEXT`    | Operator and service category from LTA.       |
| `origin_code`, `destination_code`                                                        | `TEXT`    | First and final bus-stop codes.               |
| `am_peak_frequency`, `am_offpeak_frequency`, `pm_peak_frequency`, `pm_offpeak_frequency` | `TEXT`    | LTA’s published headway ranges, e.g. `03-05`. |
| `loop_description`                                                                       | `TEXT`    | LTA’s loop description.                       |

### `bus_stops`

One record describes a physical bus stop and is reusable by many services.

| Column                     | Type               | Meaning                                                         |
| -------------------------- | ------------------ | --------------------------------------------------------------- |
| `bus_stop_code`            | `TEXT` primary key | LTA bus-stop code, retained as text to preserve leading zeroes. |
| `road_name`, `description` | `TEXT`             | Display location information.                                   |
| `latitude`, `longitude`    | `REAL`             | WGS-84 coordinates supplied by LTA.                             |

### `service_stops`

This is the ordered route membership table that joins a service direction to physical stops.
Its primary key is `(service_no, direction, stop_sequence)`.

| Column group                          | Type              | Meaning                                                        |
| ------------------------------------- | ----------------- | -------------------------------------------------------------- |
| `service_no`, `direction`             | `TEXT`, `INTEGER` | Foreign key to `bus_services`.                                 |
| `stop_sequence`                       | `INTEGER`         | Position in the route, beginning at `1`.                       |
| `bus_stop_code`                       | `TEXT`            | Foreign key to `bus_stops`; indexed for stop-centric queries.  |
| `operator`, `distance_km`             | `TEXT`, `REAL`    | Route operator and cumulative distance from the route origin.  |
| `weekday_*`, `saturday_*`, `sunday_*` | `TEXT`            | First and last scheduled bus times from LTA, in `HHmm` format. |

Do not use `(service_no, bus_stop_code)` as a key. Service 261 is a loop, so `54009` occurs at
both sequence `1` and sequence `14`; both visits matter when later recording arrivals.

### `reference_sync_runs`

This is an append-only audit trail for fixture imports. It records `service_no`, the source
snapshot’s `fetched_at`, the number of LTA Bus Routes pages scanned, and `imported_at`.
It lets us distinguish fresh reference data from stale data without overwriting history.

### `schema_migrations`

Managed by the application. Each migration ID from `src/database/migrations.ts` is recorded with
its `applied_at` timestamp. Do not edit a migration that may already have been applied; add a new
immutable migration instead.

### Reference-data workflow

For normal local development, seed the committed fixture rather than calling LTA:

```bash
npm run seed:261
npm run dev
```

`seed:261` validates the JSON fixture before making any database changes, deletes and replaces
only Service 261 route memberships in one transaction, upserts shared bus-stop and service
records, and appends a sync audit row. Re-running it is safe.

Use `npm run sync:261` only when you intentionally want to refresh the fixture from LTA. Review
the resulting JSON before committing it, then rerun `npm run seed:261`.

## Quality checks

Run all formatting, linting, type-checking, and tests before committing:

```bash
npm run check
```

Use `npm run format` and `npm run lint:fix` to apply safe automatic fixes.
Husky runs the same check automatically before every Git commit.

## Configuration

`DATABASE_PATH` must be a non-empty path when supplied. To configure the LTA DataMall
credential, copy `.env.example` to `.env` and set `LTA_DATAMALL_KEY`. The `.env` file is
ignored by Git and is loaded automatically at startup.

## Database migrations

Migrations run automatically at startup and are recorded in `schema_migrations`. Add a
new, immutable migration to `src/database/migrations.ts`; never edit one that may already
have run against a database.
