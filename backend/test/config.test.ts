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

test('configuration reads the LTA DataMall key when supplied', () => {
  const config = loadConfig({ LTA_DATAMALL_KEY: 'lta-datamall-key' })

  assert.equal(config.ltaDatamallKey, 'lta-datamall-key')
})

test('configuration rejects an empty LTA DataMall key', () => {
  assert.throws(() => loadConfig({ LTA_DATAMALL_KEY: '  ' }), {
    message: 'LTA_DATAMALL_KEY must not be empty'
  })
})
