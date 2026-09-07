<script lang="ts">
  import ServiceStopMap from '#lib/components/ServiceStopMap.svelte'

  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
  let selectedStopId = $state<string | null>(null)

  function stopId(direction: number, sequence: number): string {
    return `${direction}-${sequence}`
  }
</script>

<svelte:head>
  <title>Bus or Bust — Service 261</title>
  <meta
    name="description"
    content="Service 261 bus stops in Singapore, sourced from Bus or Bust reference data."
  />
</svelte:head>

<main>
  <header>
    <p class="eyebrow">Singapore bus reference data</p>
    <h1>Service 261</h1>
    {#if data.service}
      {@const direction = data.service.directions[0]}
      {#if direction}
        <p class="summary">
          {direction.operator} · {direction.category} · Loop via {direction.loopDescription}
        </p>
      {/if}
    {/if}
  </header>

  {#if data.error}
    <section class="status" aria-labelledby="backend-status">
      <h2 id="backend-status">Backend unavailable</h2>
      <p>
        Start the Fastify API and seed Service 261, then refresh this page. {data.error}
      </p>
    </section>
  {:else if data.service && data.service.stops.length > 0}
    <section class="map-section" aria-labelledby="map-heading">
      <div>
        <p class="eyebrow">{data.service.stops.length} recorded route visits</p>
        <h2 id="map-heading">Stops on the map</h2>
      </div>
      <ServiceStopMap
        stops={data.service.stops}
        {selectedStopId}
        onStopSelect={(id: string) => {
          selectedStopId = id
        }}
      />
    </section>

    <section class="stops-section" aria-labelledby="stops-heading">
      <div>
        <p class="eyebrow">Ordered route visits</p>
        <h2 id="stops-heading">Select a stop to locate it</h2>
      </div>
      <ol>
        {#each data.service.stops as stop (stopId(stop.direction, stop.stopSequence))}
          {@const id = stopId(stop.direction, stop.stopSequence)}
          <li>
            <button
              class:selected={id === selectedStopId}
              aria-pressed={id === selectedStopId}
              onclick={() => (selectedStopId = id)}
            >
              <span class="sequence">{stop.stopSequence}</span>
              <span>
                <strong>{stop.name}</strong>
                <small>{stop.busStopCode} · {stop.roadName} · {stop.distanceKm.toFixed(1)} km</small
                >
              </span>
            </button>
          </li>
        {/each}
      </ol>
    </section>
  {:else}
    <section class="status" aria-labelledby="empty-status">
      <h2 id="empty-status">No stops available</h2>
      <p>The backend responded successfully, but has no saved Service 261 stops yet.</p>
    </section>
  {/if}
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    background: #f8fafc;
    color: #0f172a;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }

  main {
    width: min(100% - 2rem, 72rem);
    margin: 0 auto;
    padding: 3rem 0 5rem;
  }

  header,
  .map-section,
  .stops-section,
  .status {
    margin-top: 2.5rem;
  }

  h1,
  h2,
  p {
    margin-top: 0;
  }

  h1 {
    margin-bottom: 0.5rem;
    font-size: clamp(2.5rem, 7vw, 4.5rem);
    letter-spacing: -0.06em;
  }

  h2 {
    margin-bottom: 1rem;
  }

  .eyebrow {
    margin-bottom: 0.5rem;
    color: #c2410c;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .summary {
    color: #475569;
    font-size: 1.1rem;
  }

  .status {
    max-width: 42rem;
    padding: 1.25rem;
    border-left: 4px solid #c2410c;
    background: #fff7ed;
  }

  ol {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.75rem;
    padding: 0;
    list-style: none;
  }

  button {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.75rem;
    width: 100%;
    padding: 0.85rem;
    border: 1px solid #cbd5e1;
    border-radius: 0.75rem;
    background: #ffffff;
    color: inherit;
    text-align: left;
  }

  button:hover,
  button:focus-visible,
  button.selected {
    border-color: #ea580c;
    outline: 2px solid #ea580c;
    outline-offset: 2px;
  }

  .sequence {
    display: grid;
    width: 1.8rem;
    height: 1.8rem;
    place-items: center;
    border-radius: 50%;
    background: #0f172a;
    color: white;
    font-size: 0.8rem;
    font-weight: 700;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: #64748b;
  }

  @media (max-width: 40rem) {
    main {
      padding-top: 2rem;
    }
  }
</style>
