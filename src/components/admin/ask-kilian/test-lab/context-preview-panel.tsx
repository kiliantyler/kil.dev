'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { AskKilianAdminRetrievedContext } from '@/lib/ask-kilian/admin-context-preview'

type ContextPreviewPanelPreview = {
  results: AskKilianAdminRetrievedContext[]
  contextPreview: string
}

type ContextPreviewPanelChatResponse = {
  ok?: boolean
  status?: string
  text?: string
  reason?: string
  traceId?: string
  diagnostics?: unknown
}

type ContextPreviewPanelSection = {
  id: 'retrieved-context' | 'preview-text' | 'response'
  title: string
  text: string
  emptyText?: string
}

export type ContextPreviewPanelSections = [
  ContextPreviewPanelSection,
  ContextPreviewPanelSection,
  ContextPreviewPanelSection,
]

const EMPTY_RESPONSE_TEXT = 'Generate a response to inspect the admin test answer.'
export const CONTEXT_PREVIEW_EMPTY_COPY = 'Preview retrieval or send a message to inspect context and response details.'

export function buildContextPreviewPanelSections(
  preview: ContextPreviewPanelPreview | null,
  chatResponse: ContextPreviewPanelChatResponse | null = null,
): ContextPreviewPanelSections {
  const responseText =
    chatResponse?.ok === false
      ? `Generation failed: ${chatResponse.reason ?? chatResponse.status ?? 'unknown_error'}`
      : (chatResponse?.text ?? '')

  if (!preview) {
    return [
      {
        id: 'retrieved-context',
        title: 'Retrieved context',
        text: '',
        emptyText: 'Preview retrieval to inspect matching knowledge entries.',
      },
      {
        id: 'preview-text',
        title: 'Preview text',
        text: '',
        emptyText: 'Preview retrieval to inspect the assembled context text.',
      },
      {
        id: 'response',
        title: 'Response',
        text: responseText,
        emptyText: EMPTY_RESPONSE_TEXT,
      },
    ]
  }

  return [
    {
      id: 'retrieved-context',
      title: 'Retrieved context',
      text: preview.results
        .map(
          result =>
            `[${result.stableKey}] ${result.title}\nCategory: ${result.category}\nScore: ${result.score.toFixed(3)}\n${result.text}`,
        )
        .join('\n\n'),
      emptyText: preview.results.length === 0 ? 'No matching knowledge entries.' : undefined,
    },
    {
      id: 'preview-text',
      title: 'Preview text',
      text: preview.contextPreview,
      emptyText: preview.contextPreview ? undefined : 'No context preview text returned.',
    },
    {
      id: 'response',
      title: 'Response',
      text: responseText,
      emptyText: EMPTY_RESPONSE_TEXT,
    },
  ]
}

export function ContextPreviewPanel({
  preview,
  chatResponse,
}: {
  preview: ContextPreviewPanelPreview | null
  chatResponse: ContextPreviewPanelChatResponse | null
}) {
  const sections = buildContextPreviewPanelSections(preview, chatResponse)
  const retrievedContext = sections[0]
  const previewText = sections[1]
  const response = sections[2]
  const diagnosticsText = chatResponse?.diagnostics ? JSON.stringify(chatResponse.diagnostics, null, 2) : ''

  return (
    <div className="grid gap-4">
      {preview ? null : (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          {CONTEXT_PREVIEW_EMPTY_COPY}
        </div>
      )}

      <div className="grid gap-4">
        <ContextPreviewPane section={retrievedContext} />
        <ContextPreviewPane section={previewText} />
      </div>

      <section aria-label="KTY-66 response panel" className="border-t border-border/80 pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Response</h3>
          {chatResponse?.traceId ? (
            <p className="font-mono text-xs text-muted-foreground">Trace {chatResponse.traceId}</p>
          ) : null}
        </div>

        {response.text ? (
          <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-foreground">{response.text}</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{response.emptyText}</p>
        )}

        {diagnosticsText ? (
          <div className="mt-4 grid gap-2">
            <h4 className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">Diagnostics</h4>
            <ScrollArea className="max-h-72 rounded-md border border-border bg-muted/20">
              <pre className="p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-foreground">
                {diagnosticsText}
              </pre>
            </ScrollArea>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function ContextPreviewPane({ section }: { section: ContextPreviewPanelSection }) {
  return (
    <section className="min-w-0 rounded-md border border-border bg-muted/20">
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">{section.title}</h3>
      </div>
      <ScrollArea className="max-h-72">
        {section.text ? (
          <pre className="p-3 font-mono text-xs leading-5 whitespace-pre-wrap text-foreground">{section.text}</pre>
        ) : (
          <p className="p-3 text-sm text-muted-foreground">{section.emptyText}</p>
        )}
      </ScrollArea>
    </section>
  )
}
