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

### `npm start`

Start the compiled application.

### `npm run test`

Run the test cases.

## Local database

By default, the server creates `data/bus-or-bust.sqlite` relative to the `backend`
directory. Override that location with `DATABASE_PATH` when needed.

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
