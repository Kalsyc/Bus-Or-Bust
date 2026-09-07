<script lang="ts">
  import 'maplibre-gl/dist/maplibre-gl.css'
  import { onMount } from 'svelte'

  import type { Map } from 'maplibre-gl'

  import type { ServiceStop } from '#lib/types/service.ts'

  type Props = {
    stops: ServiceStop[]
    selectedStopId: string | null
    onStopSelect: (stopId: string) => void
  }

  type StopFeature = {
    id: string
    type: 'Feature'
    properties: {
      id: string
      label: string
    }
    geometry: {
      type: 'Point'
      coordinates: [number, number]
    }
  }

  let { stops, selectedStopId, onStopSelect }: Props = $props()
  let mapContainer: HTMLDivElement
  let setSelectedStop: ((stopId: string | null) => void) | undefined
  let mapError = $state<string | null>(null)

  const pmtilesPath = '/singapore-20260907.pmtiles'

  function stopId(stop: ServiceStop): string {
    return `${stop.direction}-${stop.stopSequence}`
  }

  function stopFeatures(): StopFeature[] {
    return stops.map((stop) => ({
      id: stopId(stop),
      type: 'Feature',
      properties: {
        id: stopId(stop),
        label: `${stop.stopSequence}. ${stop.name}`
      },
      geometry: {
        type: 'Point',
        coordinates: [stop.location.longitude, stop.location.latitude]
      }
    }))
  }

  function stringProperty(value: unknown, property: string): string | undefined {
    if (!isRecord(value) || !(property in value)) {
      return undefined
    }

    const candidate = value[property]
    return typeof candidate === 'string' ? candidate : undefined
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
  }

  $effect(() => {
    setSelectedStop?.(selectedStopId)
  })

  onMount(() => {
    let map: Map | undefined

    async function initialiseMap(): Promise<void> {
      const [maplibregl, { Protocol }, { layers, namedFlavor }] = await Promise.all([
        import('maplibre-gl'),
        import('pmtiles'),
        import('@protomaps/basemaps')
      ])
      const features = stopFeatures()
      const tilesUrl = new URL(pmtilesPath, window.location.origin).href
      const protocol = new Protocol()

      maplibregl.addProtocol('pmtiles', protocol.tile)

      map = new maplibregl.Map({
        container: mapContainer,
        style: {
          version: 8,
          glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
          sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
          sources: {
            protomaps: {
              type: 'vector',
              url: `pmtiles://${tilesUrl}`,
              attribution:
                '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
            }
          },
          layers: layers('protomaps', namedFlavor('light'), { lang: 'en' })
        },
        center: [103.8198, 1.3521],
        zoom: 10.8
      })

      map.addControl(new maplibregl.NavigationControl(), 'top-right')
      map.on('error', (event) => {
        mapError = `The map could not load a resource: ${event.error.message}`
      })
      map.on('style.load', () => {
        if (!map) {
          return
        }

        map.addSource('service-261-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: features.map((feature) => feature.geometry.coordinates)
            }
          }
        })
        map.addLayer({
          id: 'service-261-route-line',
          type: 'line',
          source: 'service-261-route',
          paint: { 'line-color': '#f97316', 'line-width': 4, 'line-opacity': 0.8 }
        })

        map.addSource('service-261-stops', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features }
        })
        map.addLayer({
          id: 'service-261-stops-circle',
          type: 'circle',
          source: 'service-261-stops',
          paint: {
            'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 9, 6],
            'circle-color': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              '#0f172a',
              '#ffffff'
            ],
            'circle-stroke-color': '#0f172a',
            'circle-stroke-width': 2
          }
        })
        map.addLayer({
          id: 'service-261-stops-label',
          type: 'symbol',
          source: 'service-261-stops',
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 11,
            'text-offset': [0, 1.3],
            'text-anchor': 'top'
          },
          paint: { 'text-color': '#172554', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 }
        })

        map.on('click', 'service-261-stops-circle', (event) => {
          const id = stringProperty(event.features?.[0]?.properties, 'id')
          if (id !== undefined) {
            onStopSelect(id)
          }
        })
        map.on('mouseenter', 'service-261-stops-circle', () => {
          if (map) {
            map.getCanvas().style.cursor = 'pointer'
          }
        })
        map.on('mouseleave', 'service-261-stops-circle', () => {
          if (map) {
            map.getCanvas().style.cursor = ''
          }
        })

        setSelectedStop = (id) => {
          for (const feature of features) {
            map?.setFeatureState(
              { source: 'service-261-stops', id: feature.properties.id },
              { selected: feature.properties.id === id }
            )
          }
        }
        setSelectedStop(selectedStopId)

        const bounds = new maplibregl.LngLatBounds()
        for (const feature of features) {
          bounds.extend(feature.geometry.coordinates)
        }
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 56, maxZoom: 14 })
        }
      })
    }

    void initialiseMap()

    return () => {
      map?.remove()
      void import('maplibre-gl').then((maplibregl) => maplibregl.removeProtocol('pmtiles'))
    }
  })
</script>

<div class="map-shell" aria-label="Map of Singapore showing Service 261 bus stops">
  <div bind:this={mapContainer} class="map"></div>
  {#if mapError}
    <p class="map-error" role="alert">{mapError}</p>
  {/if}
  <p class="map-attribution">
    Map data © <a href="https://protomaps.com" rel="noreferrer" target="_blank">Protomaps</a> and
    <a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank"
      >OpenStreetMap contributors</a
    >
  </p>
</div>

<style>
  .map-shell {
    position: relative;
    min-height: 32rem;
    overflow: hidden;
    border: 1px solid #cbd5e1;
    border-radius: 1rem;
    background: #e0f2fe;
  }

  .map {
    position: absolute;
    inset: 0;
  }

  .map-attribution {
    position: absolute;
    right: 0.5rem;
    bottom: 0.25rem;
    z-index: 1;
    margin: 0;
    padding: 0.2rem 0.35rem;
    border-radius: 0.25rem;
    background: rgb(255 255 255 / 85%);
    font-size: 0.7rem;
  }

  .map-error {
    position: absolute;
    inset: auto 1rem 1rem;
    z-index: 1;
    margin: 0;
    padding: 0.75rem 1rem;
    border-left: 4px solid #b91c1c;
    background: #fff7ed;
    color: #7f1d1d;
  }

  .map-attribution a {
    color: inherit;
  }
</style>
