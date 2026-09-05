import { test } from 'node:test'
import * as assert from 'node:assert'
import { build } from '../helper.js'

test('root reports that the API is healthy', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    url: '/'
  })
  assert.equal(res.statusCode, 200)
  assert.deepStrictEqual(JSON.parse(res.payload), {
    name: 'bus-or-bust-api',
    status: 'ok'
  })
})
