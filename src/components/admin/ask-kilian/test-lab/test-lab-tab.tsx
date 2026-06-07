'use client'

import {
  AdminAlert,
  AdminPanel,
  adminSmallInputClassName,
  adminTextareaClassName,
} from '@/components/admin/admin-panel'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/motion-switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AskKilianChatMessage } from '@/lib/ask-kilian/chat-contracts'
import type { AskKilianKnowledgeCategory, AskKilianTier } from '@/lib/ask-kilian/types'
import { ASK_KILIAN_CATEGORIES, ASK_KILIAN_TIERS } from '@/lib/ask-kilian/types'
import { cn } from '@/utils/utils'
import { useState, type FormEvent } from 'react'
import type { AskKilianAdminWorkspaceController } from '../use-ask-kilian-admin-workspace'
import { ContextPreviewPanel } from './context-preview-panel'

const EMPTY_PROMPT_ERROR = 'Enter a prompt before previewing retrieval.'
const EMPTY_GENERATION_PROMPT_ERROR = 'Enter a prompt before generating a response.'
const MIN_RETRIEVAL_LIMIT = 1
const MAX_RETRIEVAL_LIMIT = 12

export const TEST_LAB_ACTION_TEXT = ['Preview retrieval', 'Generate response'] as const

export type RetrievalPreviewPayload = {
  prompt: string
  tier: AskKilianTier
  includeSpoilers: boolean
  categories: AskKilianKnowledgeCategory[]
  limit: number
}

export type RetrievalPreviewPayloadResult =
  | {
      ok: true
      payload: RetrievalPreviewPayload
    }
  | {
      ok: false
      error: typeof EMPTY_PROMPT_ERROR
    }

export type AskKilianGeneratePayload = {
  messages: AskKilianChatMessage[]
  tier: AskKilianTier
  includeSpoilers: boolean
  categories: AskKilianKnowledgeCategory[]
  promptOverride?: string
  runtimeModelOverride?: string
}

export type BuildAskKilianGeneratePayloadInput = {
  priorMessages: AskKilianChatMessage[]
  prompt: string
  tier: AskKilianTier
  includeSpoilers: boolean
  categories: AskKilianKnowledgeCategory[]
  promptOverride?: string
  runtimeModelOverride?: string
}

export type AskKilianGeneratePayloadResult =
  | {
      ok: true
      payload: AskKilianGeneratePayload
    }
  | {
      ok: false
      error: typeof EMPTY_GENERATION_PROMPT_ERROR
    }

export function clampRetrievalLimit(value: number | string) {
  const numericValue = typeof value === 'string' && value.trim() === '' ? MIN_RETRIEVAL_LIMIT : Number(value)
  if (!Number.isFinite(numericValue)) return MIN_RETRIEVAL_LIMIT

  return Math.min(MAX_RETRIEVAL_LIMIT, Math.max(MIN_RETRIEVAL_LIMIT, Math.trunc(numericValue)))
}

export function toggleCategorySelection(
  categories: AskKilianKnowledgeCategory[],
  category: AskKilianKnowledgeCategory,
): AskKilianKnowledgeCategory[] {
  return categories.includes(category)
    ? categories.filter(selectedCategory => selectedCategory !== category)
    : [...categories, category]
}

export function buildRetrievalPreviewPayload(input: RetrievalPreviewPayload): RetrievalPreviewPayloadResult {
  const prompt = input.prompt.trim()

  if (!prompt) {
    return {
      ok: false,
      error: EMPTY_PROMPT_ERROR,
    }
  }

  return {
    ok: true,
    payload: {
      prompt,
      tier: input.tier,
      includeSpoilers: input.includeSpoilers,
      categories: [...input.categories],
      limit: clampRetrievalLimit(input.limit),
    },
  }
}

export function buildAskKilianGeneratePayload(
  input: BuildAskKilianGeneratePayloadInput,
): AskKilianGeneratePayloadResult {
  const prompt = input.prompt.trim()

  if (!prompt) {
    return {
      ok: false,
      error: EMPTY_GENERATION_PROMPT_ERROR,
    }
  }

  const payload: AskKilianGeneratePayload = {
    messages: [
      ...input.priorMessages
        .map(message => ({
          role: message.role,
          content: message.content.trim(),
        }))
        .filter(message => message.content.length > 0),
      { role: 'user', content: prompt },
    ],
    tier: input.tier,
    includeSpoilers: input.includeSpoilers,
    categories: [...input.categories],
  }

  const promptOverride = input.promptOverride?.trim()
  const runtimeModelOverride = input.runtimeModelOverride?.trim()

  if (promptOverride) payload.promptOverride = promptOverride
  if (runtimeModelOverride) payload.runtimeModelOverride = runtimeModelOverride

  return {
    ok: true,
    payload,
  }
}

export function TestLabTab({ workspace }: { workspace: AskKilianAdminWorkspaceController }) {
  const [prompt, setPrompt] = useState('')
  const [priorUserMessage, setPriorUserMessage] = useState('')
  const [priorAssistantMessage, setPriorAssistantMessage] = useState('')
  const [promptOverride, setPromptOverride] = useState('')
  const [runtimeModelOverride, setRuntimeModelOverride] = useState('')
  const [tier, setTier] = useState<AskKilianTier>(1)
  const [includeSpoilers, setIncludeSpoilers] = useState(false)
  const [categories, setCategories] = useState<AskKilianKnowledgeCategory[]>([])
  const [limit, setLimit] = useState(6)
  const [validationError, setValidationError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const result = buildRetrievalPreviewPayload({
      prompt,
      tier,
      includeSpoilers,
      categories,
      limit,
    })

    if (!result.ok) {
      setValidationError(result.error)
      return
    }

    setValidationError(null)
    workspace.actions.previewRetrieval(result.payload)
  }

  function handleGenerateResponse() {
    const result = buildAskKilianGeneratePayload({
      priorMessages: [
        { role: 'user', content: priorUserMessage },
        { role: 'assistant', content: priorAssistantMessage },
      ],
      prompt,
      tier,
      includeSpoilers,
      categories,
      promptOverride,
      runtimeModelOverride,
    })

    if (!result.ok) {
      setValidationError(result.error)
      return
    }

    setValidationError(null)
    workspace.actions.generateChat(result.payload)
  }

  return (
    <AdminPanel data-testid="ask-kilian-test-lab-tab" className="flex min-w-0 flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">Test Lab</h2>
        <p className="text-sm text-muted-foreground">Preview retrieval context or generate an admin test response.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-md border border-border bg-muted/20 p-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Prompt</span>
          <textarea
            className={cn(adminTextareaClassName, 'min-h-28 resize-y')}
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Previous user message</span>
            <textarea
              className={cn(adminTextareaClassName, 'min-h-20 resize-y')}
              value={priorUserMessage}
              onChange={event => setPriorUserMessage(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Previous assistant response</span>
            <textarea
              className={cn(adminTextareaClassName, 'min-h-20 resize-y')}
              value={priorAssistantMessage}
              onChange={event => setPriorAssistantMessage(event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(10rem,14rem)_minmax(8rem,10rem)_auto] md:items-end">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Tier</span>
            <Select value={String(tier)} onValueChange={value => setTier(Number(value) as AskKilianTier)}>
              <SelectTrigger aria-label="Tier" className="h-9 border-primary/50 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASK_KILIAN_TIERS.map(tierOption => (
                  <SelectItem key={tierOption} value={String(tierOption)}>
                    Tier {tierOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Limit</span>
            <input
              className={adminSmallInputClassName}
              type="number"
              min={MIN_RETRIEVAL_LIMIT}
              max={MAX_RETRIEVAL_LIMIT}
              step={1}
              value={limit}
              onChange={event => setLimit(clampRetrievalLimit(event.target.value))}
            />
          </label>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
            <Switch
              size="sm"
              checked={includeSpoilers}
              onCheckedChange={setIncludeSpoilers}
              aria-label="Include spoilers"
            />
            <span className="text-sm font-medium">Include spoilers</span>
          </label>
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Categories</legend>
          <div className="flex flex-wrap gap-2">
            {ASK_KILIAN_CATEGORIES.map(category => {
              const selected = categories.includes(category)

              return (
                <Button
                  key={category}
                  type="button"
                  size="sm"
                  variant={selected ? 'default' : 'outline'}
                  aria-pressed={selected}
                  onClick={() =>
                    setCategories(currentCategories => toggleCategorySelection(currentCategories, category))
                  }
                  className="capitalize">
                  {category}
                </Button>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Prompt override</span>
            <textarea
              className={cn(adminTextareaClassName, 'min-h-20 resize-y')}
              value={promptOverride}
              onChange={event => setPromptOverride(event.target.value)}
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Runtime model override</span>
            <input
              className={adminSmallInputClassName}
              value={runtimeModelOverride}
              onChange={event => setRuntimeModelOverride(event.target.value)}
            />
          </label>
        </div>

        {validationError ? <AdminAlert>{validationError}</AdminAlert> : null}
        {workspace.retrievalError ? <AdminAlert>{workspace.retrievalError}</AdminAlert> : null}
        {workspace.chatError ? <AdminAlert>{workspace.chatError}</AdminAlert> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={workspace.isPending}>
            {TEST_LAB_ACTION_TEXT[0]}
          </Button>
          <Button type="button" variant="secondary" disabled={workspace.isPending} onClick={handleGenerateResponse}>
            {TEST_LAB_ACTION_TEXT[1]}
          </Button>
        </div>
      </form>

      <ContextPreviewPanel preview={workspace.retrievalPreview} chatResponse={workspace.chatResponse} />
    </AdminPanel>
  )
}
