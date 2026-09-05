import type { after } from 'node:test'
import Fastify from 'fastify'

import appPlugin from '../src/app.ts'

export type TestContext = {
  after: typeof after
}

async function build(t: TestContext) {
  const app = Fastify()
  await app.register(appPlugin, { databasePath: ':memory:' })
  await app.ready()

  t.after(() => void app.close())

  return app
}

export { build }
