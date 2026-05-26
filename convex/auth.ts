import { AuthKit } from '@convex-dev/workos-authkit'
import { components, internal } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
export { getWorkOSAuthConfigProviders } from './authConfigProviders'

const REQUIRED_AUTHKIT_ENV = ['WORKOS_CLIENT_ID', 'WORKOS_API_KEY', 'WORKOS_WEBHOOK_SECRET'] as const

export function getMissingWorkOSAuthKitEnv() {
  return REQUIRED_AUTHKIT_ENV.filter(key => !process.env[key])
}

export function getAuthKit(): AuthKit<DataModel> {
  return new AuthKit<DataModel>(components.workOSAuthKit, {
    authFunctions: internal.workOSAuthKitActions,
  })
}

const authKitFunctionDefinitions = new AuthKit<DataModel>(components.workOSAuthKit, {
  clientId: process.env.WORKOS_CLIENT_ID || 'client_placeholder_for_function_definition',
  apiKey: process.env.WORKOS_API_KEY || 'sk_placeholder_for_function_definition',
  webhookSecret: process.env.WORKOS_WEBHOOK_SECRET || 'whsec_placeholder_for_function_definition',
  actionSecret: process.env.WORKOS_ACTION_SECRET || 'action_secret_placeholder_for_function_definition',
})

export const { backfillUsers } = authKitFunctionDefinitions.utils()
