const ltaDataMallBaseUrl = 'https://datamall2.mytransport.sg/ltaodataservice/'

type LtaDataMallClientOptions = {
  apiKey: string | undefined
  fetchImplementation?: typeof fetch
}

export class LtaDataMallError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LtaDataMallError'
  }
}

export type LtaDataMallClient = {
  get(path: string, query?: Record<string, string | number | undefined>): Promise<unknown>
}

export function createLtaDataMallClient({
  apiKey,
  fetchImplementation = fetch
}: LtaDataMallClientOptions): LtaDataMallClient {
  return {
    async get(path, query = {}): Promise<unknown> {
      if (apiKey === undefined) {
        throw new LtaDataMallError('LTA_DATAMALL_KEY is required to call LTA DataMall')
      }

      const url = new URL(path, ltaDataMallBaseUrl)
      for (const [name, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(name, String(value))
        }
      }

      let response: Response
      try {
        response = await fetchImplementation(url, {
          headers: {
            Accept: 'application/json',
            AccountKey: apiKey
          },
          signal: AbortSignal.timeout(10_000)
        })
      } catch (error) {
        throw new LtaDataMallError(
          `LTA DataMall request failed: ${error instanceof Error ? error.message : 'unknown error'}`
        )
      }

      if (!response.ok) {
        throw new LtaDataMallError(`LTA DataMall returned HTTP ${response.status}`)
      }

      return response.json()
    }
  }
}
