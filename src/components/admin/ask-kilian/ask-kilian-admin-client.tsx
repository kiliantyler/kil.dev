'use client'

import { AdminLavaTabs } from '@/components/admin/admin-lava-tabs'
import type { AskKilianAdminWorkspaceState } from '@/lib/ask-kilian/admin-workspace-shared'
import { useEffect, useState } from 'react'
import { AskKilianStatusLights } from './ask-kilian-status-lights'
import { KnowledgeTab } from './knowledge/knowledge-tab'
import { OpsTab } from './ops/ops-tab'
import { TestLabTab } from './test-lab/test-lab-tab'
import { useAskKilianAdminWorkspace } from './use-ask-kilian-admin-workspace'

const ASK_KILIAN_ADMIN_TABS = ['knowledge', 'ops', 'test-lab'] as const
type AskKilianAdminTab = (typeof ASK_KILIAN_ADMIN_TABS)[number]

const TAB_LABELS: Record<AskKilianAdminTab, string> = {
  knowledge: 'Knowledge',
  ops: 'Ops',
  'test-lab': 'Test Lab',
}

function normalizeAskKilianAdminTab(value: string | null): AskKilianAdminTab {
  return ASK_KILIAN_ADMIN_TABS.includes(value as AskKilianAdminTab) ? (value as AskKilianAdminTab) : 'knowledge'
}

function readCurrentTabFromUrl(): AskKilianAdminTab {
  if (globalThis.window === undefined) return 'knowledge'
  return normalizeAskKilianAdminTab(new URL(globalThis.location.href).searchParams.get('tab'))
}

export function AskKilianAdminClient({ initialState }: { initialState: AskKilianAdminWorkspaceState }) {
  const [activeTab, setActiveTab] = useState<AskKilianAdminTab>('knowledge')
  const workspace = useAskKilianAdminWorkspace(initialState)

  useEffect(() => {
    setActiveTab(readCurrentTabFromUrl())
    const syncTabFromHistory = () => setActiveTab(readCurrentTabFromUrl())
    globalThis.addEventListener('popstate', syncTabFromHistory)
    return () => globalThis.removeEventListener('popstate', syncTabFromHistory)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <AskKilianStatusLights statuses={[workspace.state.runtimeStatus, workspace.state.ragStatus]} />
      <AdminLavaTabs
        centered
        tabs={ASK_KILIAN_ADMIN_TABS.map(tab => ({
          value: tab,
          label: TAB_LABELS[tab],
          panelId: `ask-kilian-${tab}-panel`,
          tabId: `ask-kilian-${tab}-tab`,
        }))}
        activeTab={activeTab}
        defaultTab="knowledge"
        ariaLabel="Ask Kilian admin sections"
        onTabChange={setActiveTab}
      />
      {ASK_KILIAN_ADMIN_TABS.map(tab => (
        <section
          key={tab}
          role="tabpanel"
          id={`ask-kilian-${tab}-panel`}
          aria-labelledby={`ask-kilian-${tab}-tab`}
          hidden={activeTab !== tab}
          className="min-w-0">
          {activeTab === tab && tab === 'knowledge' ? <KnowledgeTab workspace={workspace} /> : null}
          {activeTab === tab && tab === 'ops' ? <OpsTab workspace={workspace} /> : null}
          {activeTab === tab && tab === 'test-lab' ? <TestLabTab workspace={workspace} /> : null}
        </section>
      ))}
    </div>
  )
}
