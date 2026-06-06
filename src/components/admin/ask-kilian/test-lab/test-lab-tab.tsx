'use client'

import type { AskKilianAdminWorkspaceController } from '../use-ask-kilian-admin-workspace'

export function TestLabTab({ workspace: _workspace }: { workspace: AskKilianAdminWorkspaceController }) {
  return <div data-testid="ask-kilian-test-lab-tab" />
}
