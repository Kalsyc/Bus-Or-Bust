import * as assert from 'node:assert'
import { test } from 'node:test'

import { build } from '../helper.js'

test('database health endpoint can query SQLite', async (t) => {
  const app = await build(t)

  const response = await app.inject({ url: '/database/health' })
  const payload = JSON.parse(response.payload) as { database: string; version: string }

  assert.equal(response.statusCode, 200)
  assert.equal(payload.database, 'ok')
  assert.match(payload.version, /^\d+\.\d+\.\d+$/)
})
