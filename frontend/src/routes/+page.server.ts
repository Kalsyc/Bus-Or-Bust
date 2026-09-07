import { fetchService261 } from '#lib/server/service-261.ts'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    return { service: await fetchService261(fetch), error: null }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The backend could not be reached.'
    return { service: null, error: message }
  }
}
