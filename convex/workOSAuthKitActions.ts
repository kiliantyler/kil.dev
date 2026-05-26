import { AuthKit } from '@convex-dev/workos-authkit'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'

type WorkOSActionPayload = {
  user?: { email?: unknown }
  userData?: { email?: unknown }
  organization?: { id?: unknown }
  organizationMembership?: { organizationId?: unknown }
  invitation?: { organizationId?: unknown }
}

type WorkOSActionResponse<Response> = {
  allow: () => Response
  deny: (errorMessage: string) => Response
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function configuredValue(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function getActionEmail(action: WorkOSActionPayload) {
  const email = action.user?.email ?? action.userData?.email
  return typeof email === 'string' ? email : undefined
}

function getActionOrganizationId(action: WorkOSActionPayload) {
  const organizationId =
    action.organization?.id ?? action.organizationMembership?.organizationId ?? action.invitation?.organizationId
  return typeof organizationId === 'string' ? organizationId : undefined
}

function getWorkOSActionDenyReason(action: WorkOSActionPayload) {
  const adminEmail = configuredValue(process.env.PET_GALLERY_ADMIN_EMAIL)
  const adminOrganizationId = configuredValue(process.env.PET_GALLERY_WORKOS_ORG_ID)
  const actionEmail = getActionEmail(action)
  const actionOrganizationId = getActionOrganizationId(action)

  if (adminEmail && (!actionEmail || normalizeEmail(actionEmail) !== normalizeEmail(adminEmail))) {
    return 'This account is not allowed to access the pet gallery admin.'
  }

  if (adminOrganizationId && actionOrganizationId !== adminOrganizationId) {
    return 'This organization is not allowed to access the pet gallery admin.'
  }

  return
}

export function allowWorkOSAction<Response>(
  action: WorkOSActionPayload,
  { allow, deny }: WorkOSActionResponse<Response>,
): Response {
  const denyReason = getWorkOSActionDenyReason(action)
  if (denyReason) return deny(denyReason)
  return allow()
}

const authKitActions = new AuthKit<DataModel>(components.workOSAuthKit, {
  clientId: process.env.WORKOS_CLIENT_ID || 'client_placeholder_for_action_definition',
  apiKey: process.env.WORKOS_API_KEY || 'sk_placeholder_for_action_definition',
  webhookSecret: process.env.WORKOS_WEBHOOK_SECRET || 'whsec_placeholder_for_action_definition',
  actionSecret: process.env.WORKOS_ACTION_SECRET || 'action_secret_placeholder_for_action_definition',
}).actions({
  authentication: async (_ctx, action, response) => allowWorkOSAction(action, response),
  userRegistration: async (_ctx, action, response) => allowWorkOSAction(action, response),
})

export const { authKitAction } = authKitActions
