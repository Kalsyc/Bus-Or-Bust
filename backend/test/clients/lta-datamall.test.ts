import * as assert from 'node:assert'
import { test } from 'node:test'

import { createLtaDataMallClient, LtaDataMallError } from '../../src/clients/lta-datamall.ts'

test('LTA DataMall client sends the AccountKey and query parameters', async () => {
  const client = createLtaDataMallClient({
    apiKey: 'test-key',
    fetchImplementation: async (url, options) => {
      assert.ok(url instanceof URL)
      assert.equal(
        url.href,
        'https://datamall2.mytransport.sg/ltaodataservice/BusServices?ServiceNo=261'
      )
      assert.equal(new Headers(options?.headers).get('AccountKey'), 'test-key')
      return Response.json({ value: [] })
    }
  })

  assert.deepStrictEqual(await client.get('BusServices', { ServiceNo: '261' }), { value: [] })
})

test('LTA DataMall client requires an API key', async () => {
  const client = createLtaDataMallClient({ apiKey: undefined })

  await assert.rejects(client.get('BusServices'), LtaDataMallError)
})
