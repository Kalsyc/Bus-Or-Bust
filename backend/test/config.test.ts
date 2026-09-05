import * as assert from 'node:assert'
import { test } from 'node:test'

import { loadConfig } from '../src/config.ts'

test('configuration uses the default local database path', () => {
  const config = loadConfig({})

  assert.match(config.databasePath, /data\/bus-or-bust\.sqlite$/)
})

test('configuration rejects an empty database path', () => {
  assert.throws(() => loadConfig({ DATABASE_PATH: '  ' }), {
    message: 'DATABASE_PATH must not be empty'
  })
})
