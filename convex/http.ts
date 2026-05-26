import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { getAuthKit, getMissingWorkOSAuthKitEnv } from './auth'

const http = httpRouter()
const missingAuthKitEnv = getMissingWorkOSAuthKitEnv()

if (missingAuthKitEnv.length === 0) {
  getAuthKit().registerRoutes(http)
} else {
  const missingEnvHandler = httpAction(
    async () =>
      new Response(`WorkOS AuthKit environment is not configured: ${missingAuthKitEnv.join(', ')}`, {
        status: 503,
      }),
  )

  http.route({
    path: '/workos/webhook',
    method: 'POST',
    handler: missingEnvHandler,
  })
  http.route({
    path: '/workos/action',
    method: 'POST',
    handler: missingEnvHandler,
  })
}

export default http
