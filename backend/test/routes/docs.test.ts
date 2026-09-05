import * as assert from 'node:assert'
import { test } from 'node:test'

import { build } from '../helper.js'

test('OpenAPI documentation includes the application routes', async (t) => {
  const app = await build(t)

  const response = await app.inject({ url: '/docs/json' })
  const specification = JSON.parse(response.payload) as {
    info: { title: string; version: string }
    openapi: string
    paths: Record<string, unknown>
  }

  assert.equal(response.statusCode, 200)
  assert.match(specification.openapi, /^3\./)
  assert.equal(specification.info.title, 'Bus or Bust API')
  assert.equal(specification.info.version, '0.1.0')
  assert.ok('/' in specification.paths)
  assert.ok('/database/health' in specification.paths)
})
