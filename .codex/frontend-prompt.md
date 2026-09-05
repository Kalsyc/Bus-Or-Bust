# Frontend context

Build the frontend for **Bus or Bust**, a local-first Singapore bus reliability application.
The frontend will be written in SvelteKit with strict TypeScript. The Fastify backend lives in
`../backend` and is the sole owner of SQLite and LTA DataMall access; never expose the LTA API
key to the browser.

## v0.1 goal

Create a small, useful page for Singapore bus service **261**. It should visualise its route stops
and make the underlying reference data easy to inspect. Do not build reliability scores, arrival
polling controls, authentication, or a general all-services experience yet.

## Backend contract

Start the backend separately with `npm run dev` from `backend/`, after running `npm run seed:261`.
Its local default URL is `http://localhost:3000`.

Use only these public reference endpoints:

- `GET /services/261`
- `GET /services/261/stops`

`GET /services/261/stops` returns route visits in order. Each stop contains:

```ts
type ServiceStop = {
  direction: number
  stopSequence: number
  busStopCode: string
  distanceKm: number
  name: string
  roadName: string
  location: { latitude: number; longitude: number }
  operatingHours: {
    weekday: { firstBus: string; lastBus: string }
    saturday: { firstBus: string; lastBus: string }
    sunday: { firstBus: string; lastBus: string }
  }
}
```

The service is a loop. Bus stop `54009` appears twice, at route sequences 1 and 14. Preserve both
visits in the ordered route UI; never identify a rendered route visit solely by `busStopCode`.

## First screen

Make a responsive Service 261 page with:

- A concise service header: service number, operator, category, loop description, and published
  AM/PM frequency ranges.
- An ordered route-stop list or timeline as the primary visualisation. Each item shows sequence,
  stop name, stop code, road name, cumulative distance, and today-relevant first/last bus times.
- A selected-stop detail panel or expandable row that reveals all weekday, Saturday, and Sunday
  operating hours plus latitude/longitude.
- Clear loading, unavailable-backend, and empty/error states.
- Semantic HTML, keyboard-accessible selection/expansion, and no information conveyed by colour
  alone.

Avoid a map in this first slice unless it can be added with very little complexity and no external
key. The ordered route is the authoritative initial visualisation; coordinates should be retained
in the typed data model for a later map.

## Data and architecture rules

- Fetch from SvelteKit server-side load code using a server-only `BACKEND_URL` environment variable
  (default it locally to `http://localhost:3000`). Do not require Fastify CORS for this first page.
- Keep backend response types close to the fetching boundary and validate enough structure to show
  an actionable error instead of silently rendering malformed data.
- Keep components small and feature-oriented. No global state library is needed.
- Use SvelteKit’s conventional routing, Svelte accessibility warnings, and strict TypeScript.
- Do not read the SQLite file directly from the frontend and do not call LTA DataMall from it.
- Treat the OpenAPI document at `http://localhost:3000/docs` as the source for endpoint details.

## Design direction

Aim for calm, legible transit information: route sequence should be visually obvious, dense data
should remain scannable, and mobile use should be first-class. Use local fixture-backed backend
data during development. Build the smallest complete vertical slice first, with tests appropriate
to the SvelteKit setup.
