'use client'

import {
  AdminAlert,
  AdminPanel,
  adminSmallInputClassName,
  adminTextareaClassName,
} from '@/components/admin/admin-panel'
import { AskKilianChatPanel } from '@/components/ask-kilian/chat/chat-panel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/motion-switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AskKilianChatMessage } from '@/lib/ask-kilian/chat-contracts'
import type { AskKilianKnowledgeCategory, AskKilianTier } from '@/lib/ask-kilian/types'
import { ASK_KILIAN_CATEGORIES, ASK_KILIAN_TIERS } from '@/lib/ask-kilian/types'
import { cn } from '@/utils/utils'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { AskKilianAdminWorkspaceController } from '../use-ask-kilian-admin-workspace'
import { ContextPreviewPanel } from './context-preview-panel'

const EMPTY_PROMPT_ERROR = 'Enter a prompt before previewing retrieval.'
const EMPTY_GENERATION_PROMPT_ERROR = 'Enter a prompt before generating a response.'
const EMPTY_PROMPT_CONFIG_ERROR = 'Enter an active system prompt before saving.'
const EMPTY_RUNTIME_MODEL_ERROR = 'Enter an active model id before saving runtime config.'
const MIN_RETRIEVAL_LIMIT = 1
const MAX_RETRIEVAL_LIMIT = 12
const MIN_RUNTIME_NUMERIC_VALUE = 1
const MIN_RUNTIME_TEMPERATURE = 0
const MAX_RUNTIME_TEMPERATURE = 2
const UNSET_MODEL_PICKER_VALUE = 'unset'
const CUSTOM_MODEL_PICKER_VALUE = 'custom'

export const TEST_LAB_ACTION_TEXT = ['Preview retrieval', 'Send message'] as const

export const ASK_KILIAN_MODEL_PRESETS = [
  {
    id: 'google/gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite',
    detail: '$0.25/M in · $1.50/M out · 1M context',
  },
  {
    id: 'openai/gpt-4.1-mini',
    label: 'GPT-4.1 mini',
    detail: '$0.40/M in · $1.60/M out · stable baseline',
  },
  {
    id: 'xai/grok-4.1-fast-non-reasoning',
    label: 'Grok 4.1 Fast Non-Reasoning',
    detail: '$0.20/M in · $0.50/M out · fast cheap chat',
  },
  {
    id: 'deepseek/deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    detail: '$0.14/M in · $0.28/M out · very low cost',
  },
  {
    id: 'alibaba/qwen3.5-flash',
    label: 'Qwen 3.5 Flash',
    detail: '$0.10/M in · $0.40/M out · cheap reasoning',
  },
  {
    id: 'alibaba/qwen-3-30b',
    label: 'Qwen3 30B',
    detail: '$0.08/M in · $0.29/M out · compact fallback',
  },
  {
    id: 'anthropic/claude-haiku-4.5',
    label: 'Claude Haiku 4.5',
    detail: '$1.00/M in · $5.00/M out · voice quality check',
  },
  {
    id: 'openai/gpt-5.4-mini',
    label: 'GPT 5.4 Mini',
    detail: '$0.75/M in · $4.50/M out · OpenAI current mini',
  },
] as const

export function resolveModelPickerValue(modelId: string) {
  if (!modelId.trim()) return UNSET_MODEL_PICKER_VALUE
  return ASK_KILIAN_MODEL_PRESETS.some(preset => preset.id === modelId.trim())
    ? modelId.trim()
    : CUSTOM_MODEL_PICKER_VALUE
}

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

type AskKilianGeneratePayload = {
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

type RuntimeConfigPayload = {
  modelId: string
  maxOutputTokens: number
  temperature: number
  conversationWindow: number
  ragLimit: number
  quota: {
    adminTestDailyRequests: number
    publicDailyRequests: number
    publicDailyEstimatedTokens: number
  }
}

export type RuntimeConfigPayloadResult =
  | {
      ok: true
      payload: RuntimeConfigPayload
    }
  | {
      ok: false
      error: typeof EMPTY_RUNTIME_MODEL_ERROR
    }

export function clampRetrievalLimit(value: number | string) {
  const numericValue = typeof value === 'string' && value.trim() === '' ? MIN_RETRIEVAL_LIMIT : Number(value)
  if (!Number.isFinite(numericValue)) return MIN_RETRIEVAL_LIMIT

  return Math.min(MAX_RETRIEVAL_LIMIT, Math.max(MIN_RETRIEVAL_LIMIT, Math.trunc(numericValue)))
}

function clampRuntimePositiveInteger(value: number) {
  if (!Number.isFinite(value)) return MIN_RUNTIME_NUMERIC_VALUE

  return Math.max(MIN_RUNTIME_NUMERIC_VALUE, Math.trunc(value))
}

function clampRuntimeTemperature(value: number) {
  if (value === Infinity) return MAX_RUNTIME_TEMPERATURE
  if (!Number.isFinite(value)) return MIN_RUNTIME_TEMPERATURE

  return Math.max(MIN_RUNTIME_TEMPERATURE, Math.min(MAX_RUNTIME_TEMPERATURE, Number(value)))
}

export function buildAskKilianRuntimeConfigPayload(input: {
  modelId: string
  maxOutputTokens: number
  temperature: number
  conversationWindow: number
  ragLimit: number
  adminTestDailyRequests: number
  publicDailyRequests: number
  publicDailyEstimatedTokens: number
}): RuntimeConfigPayloadResult {
  const modelId = input.modelId.trim()
  if (!modelId) {
    return {
      ok: false,
      error: EMPTY_RUNTIME_MODEL_ERROR,
    }
  }

  return {
    ok: true,
    payload: {
      modelId,
      maxOutputTokens: clampRuntimePositiveInteger(input.maxOutputTokens),
      temperature: clampRuntimeTemperature(input.temperature),
      conversationWindow: clampRuntimePositiveInteger(input.conversationWindow),
      ragLimit: clampRetrievalLimit(input.ragLimit),
      quota: {
        adminTestDailyRequests: clampRuntimePositiveInteger(input.adminTestDailyRequests),
        publicDailyRequests: clampRuntimePositiveInteger(input.publicDailyRequests),
        publicDailyEstimatedTokens: clampRuntimePositiveInteger(input.publicDailyEstimatedTokens),
      },
    },
  }
}

export function toggleCategorySelection(
  categories: AskKilianKnowledgeCategory[],
  category: AskKilianKnowledgeCategory,
): AskKilianKnowledgeCategory[] {
  return categories.includes(category)
    ? categories.filter(selectedCategory => selectedCategory !== category)
    : [...categories, category]
}

export function formatSelectedCategoriesLabel(categories: AskKilianKnowledgeCategory[]) {
  if (categories.length === 0) return 'All categories'
  if (categories.length === 1) return categories[0]
  return `${categories.length} categories`
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
  const [chatMessages, setChatMessages] = useState<AskKilianChatMessage[]>([])
  const [promptOverride, setPromptOverride] = useState('')
  const [runtimeModelOverride, setRuntimeModelOverride] = useState('')
  const [promptConfigTitle, setPromptConfigTitle] = useState(workspace.state.activePromptConfig?.title ?? '')
  const [promptConfigText, setPromptConfigText] = useState(workspace.state.activePromptConfig?.promptText ?? '')
  const [promptConfigNotes, setPromptConfigNotes] = useState(workspace.state.activePromptConfig?.notes ?? '')
  const [runtimeModelId, setRuntimeModelId] = useState(workspace.state.activeRuntimeConfig?.modelId ?? '')
  const [runtimeModelPickerValue, setRuntimeModelPickerValue] = useState(
    resolveModelPickerValue(workspace.state.activeRuntimeConfig?.modelId ?? ''),
  )
  const [runtimeMaxOutputTokens, setRuntimeMaxOutputTokens] = useState(
    workspace.state.activeRuntimeConfig?.maxOutputTokens ?? 900,
  )
  const [runtimeTemperature, setRuntimeTemperature] = useState(workspace.state.activeRuntimeConfig?.temperature ?? 0.7)
  const [runtimeConversationWindow, setRuntimeConversationWindow] = useState(
    workspace.state.activeRuntimeConfig?.conversationWindow ?? 8,
  )
  const [runtimeRagLimit, setRuntimeRagLimit] = useState(workspace.state.activeRuntimeConfig?.ragLimit ?? 6)
  const [runtimeAdminDailyRequests, setRuntimeAdminDailyRequests] = useState(
    workspace.state.activeRuntimeConfig?.quota.adminTestDailyRequests ?? 100,
  )
  const [runtimePublicDailyRequests, setRuntimePublicDailyRequests] = useState(
    workspace.state.activeRuntimeConfig?.quota.publicDailyRequests ?? 40,
  )
  const [runtimePublicDailyEstimatedTokens, setRuntimePublicDailyEstimatedTokens] = useState(
    workspace.state.activeRuntimeConfig?.quota.publicDailyEstimatedTokens ?? 60_000,
  )
  const [tier, setTier] = useState<AskKilianTier>(1)
  const [includeSpoilers, setIncludeSpoilers] = useState(false)
  const [categories, setCategories] = useState<AskKilianKnowledgeCategory[]>([])
  const [limit, setLimit] = useState(6)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [runtimeSetupOpen, setRuntimeSetupOpen] = useState(
    !workspace.state.activePromptConfig || !workspace.state.activeRuntimeConfig,
  )
  const [promptSetupOpen, setPromptSetupOpen] = useState(!workspace.state.activePromptConfig)
  const [contextDebugOpen, setContextDebugOpen] = useState(
    Boolean(workspace.retrievalPreview || workspace.chatResponse),
  )
  const handledResponseTraceId = useRef<string | null>(null)

  useEffect(() => {
    const activePromptConfig = workspace.state.activePromptConfig
    if (!activePromptConfig) return
    setPromptConfigTitle(activePromptConfig.title)
    setPromptConfigText(activePromptConfig.promptText)
    setPromptConfigNotes(activePromptConfig.notes ?? '')
  }, [workspace.state.activePromptConfig])

  useEffect(() => {
    const activeRuntimeConfig = workspace.state.activeRuntimeConfig
    if (!activeRuntimeConfig) return
    setRuntimeModelId(activeRuntimeConfig.modelId)
    setRuntimeModelPickerValue(resolveModelPickerValue(activeRuntimeConfig.modelId))
    setRuntimeMaxOutputTokens(activeRuntimeConfig.maxOutputTokens)
    setRuntimeTemperature(activeRuntimeConfig.temperature)
    setRuntimeConversationWindow(activeRuntimeConfig.conversationWindow)
    setRuntimeRagLimit(activeRuntimeConfig.ragLimit)
    setRuntimeAdminDailyRequests(activeRuntimeConfig.quota.adminTestDailyRequests)
    setRuntimePublicDailyRequests(activeRuntimeConfig.quota.publicDailyRequests)
    setRuntimePublicDailyEstimatedTokens(activeRuntimeConfig.quota.publicDailyEstimatedTokens)
  }, [workspace.state.activeRuntimeConfig])

  useEffect(() => {
    const response = workspace.chatResponse
    if (!response?.traceId || handledResponseTraceId.current === response.traceId) return

    handledResponseTraceId.current = response.traceId
    setContextDebugOpen(true)
    if (response.ok !== true || !response.text?.trim()) return

    setChatMessages(currentMessages => [...currentMessages, { role: 'assistant', content: response.text.trim() }])
  }, [workspace.chatResponse])

  useEffect(() => {
    if (workspace.retrievalPreview) setContextDebugOpen(true)
  }, [workspace.retrievalPreview])

  function handlePreviewRetrieval() {
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

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    handleGenerateResponse()
  }

  function handleGenerateResponse() {
    const result = buildAskKilianGeneratePayload({
      priorMessages: chatMessages,
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
    setChatMessages(currentMessages => [...currentMessages, { role: 'user', content: prompt.trim() }])
    setPrompt('')
  }

  function handleClearChat() {
    handledResponseTraceId.current = null
    setChatMessages([])
    setPrompt('')
    setValidationError(null)
    workspace.actions.clearChatResponse()
  }

  function handleModelPickerChange(value: string) {
    setRuntimeModelPickerValue(value)
    if (value === UNSET_MODEL_PICKER_VALUE) {
      setRuntimeModelId('')
      return
    }
    if (value === CUSTOM_MODEL_PICKER_VALUE) return
    setRuntimeModelId(value)
  }

  function handleSavePromptConfig() {
    const promptText = promptConfigText.trim()
    if (!promptText) {
      setConfigError(EMPTY_PROMPT_CONFIG_ERROR)
      return
    }

    setConfigError(null)
    void workspace.actions.savePromptConfig({
      title: promptConfigTitle.trim() || 'Ask Kilian prompt',
      promptText,
      notes: promptConfigNotes.trim() || undefined,
    })
  }

  function handleSaveRuntimeConfig() {
    const result = buildAskKilianRuntimeConfigPayload({
      modelId: runtimeModelId,
      maxOutputTokens: runtimeMaxOutputTokens,
      temperature: runtimeTemperature,
      conversationWindow: runtimeConversationWindow,
      ragLimit: runtimeRagLimit,
      adminTestDailyRequests: runtimeAdminDailyRequests,
      publicDailyRequests: runtimePublicDailyRequests,
      publicDailyEstimatedTokens: runtimePublicDailyEstimatedTokens,
    })

    if (!result.ok) {
      setConfigError(result.error)
      return
    }

    setConfigError(null)
    void workspace.actions.saveRuntimeConfig(result.payload)
  }

  return (
    <AdminPanel data-testid="ask-kilian-test-lab-tab" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/80 pb-4">
        <div>
          <h2 className="text-lg font-semibold">Test Lab</h2>
          <p className="text-sm text-muted-foreground">
            Talk to the live admin test bot, then inspect what powered the answer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={cn(
              'rounded-md border px-2 py-1',
              workspace.state.activePromptConfig
                ? 'border-border bg-muted/30'
                : 'border-destructive/40 text-destructive',
            )}>
            Prompt {workspace.state.activePromptConfig ? 'active' : 'missing'}
          </span>
          <span
            className={cn(
              'rounded-md border px-2 py-1',
              workspace.state.activeRuntimeConfig
                ? 'border-border bg-muted/30'
                : 'border-destructive/40 text-destructive',
            )}>
            Runtime {workspace.state.activeRuntimeConfig ? 'active' : 'missing'}
          </span>
          <span className="rounded-md border border-border bg-muted/30 px-2 py-1">
            RAG {workspace.state.ragStatus.level}
          </span>
        </div>
      </div>

      <AskKilianChatPanel
        title="Chat"
        subtitle="Admin test conversation"
        messages={chatMessages}
        value={prompt}
        onValueChange={setPrompt}
        onSubmit={handleChatSubmit}
        onClear={handleClearChat}
        disabled={workspace.isPending}
        isResponding={workspace.isPending}
        placeholder="Ask about projects, pets, site lore, career, or achievements..."
        emptyTitle="No messages yet"
        emptyDescription="Send a message to test the bot with the active Convex prompt, model, quota, and RAG settings."
        submitLabel="Send"
        controls={
          <>
            <label className="grid min-w-28 gap-1">
              <span className="text-xs font-medium text-muted-foreground">Tier</span>
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

            <label className="grid w-20 gap-1">
              <span className="text-xs font-medium text-muted-foreground">Limit</span>
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

            <label className="mt-5 flex min-h-9 items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
              <Switch
                size="sm"
                checked={includeSpoilers}
                onCheckedChange={setIncludeSpoilers}
                aria-label="Include spoilers"
              />
              <span className="text-sm font-medium">Spoilers</span>
            </label>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="mt-5 min-h-9 gap-2">
                  <span>{formatSelectedCategoriesLabel(categories)}</span>
                  <ChevronDown aria-hidden="true" className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-56">
                <DropdownMenuLabel>Categories</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ASK_KILIAN_CATEGORIES.map(category => (
                  <DropdownMenuCheckboxItem
                    key={category}
                    checked={categories.includes(category)}
                    onSelect={event => event.preventDefault()}
                    onCheckedChange={() =>
                      setCategories(currentCategories => toggleCategorySelection(currentCategories, category))
                    }
                    className="capitalize">
                    {category}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        secondaryActions={
          <Button
            type="button"
            variant="outline"
            disabled={workspace.isPending || !prompt.trim()}
            onClick={handlePreviewRetrieval}>
            {TEST_LAB_ACTION_TEXT[0]}
          </Button>
        }
        alerts={
          <>
            {validationError ? <AdminAlert>{validationError}</AdminAlert> : null}
            {workspace.retrievalError ? <AdminAlert>{workspace.retrievalError}</AdminAlert> : null}
            {workspace.chatError ? <AdminAlert>{workspace.chatError}</AdminAlert> : null}
          </>
        }
      />

      <details
        className="group rounded-md border border-border bg-background"
        open={runtimeSetupOpen}
        onToggle={event => setRuntimeSetupOpen(event.currentTarget.open)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden">
          <span>
            <span className="block text-sm font-semibold">Runtime setup</span>
            <span className="block text-xs text-muted-foreground">{workspace.state.runtimeStatus.reason}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="grid gap-4 border-t border-border p-4">
          <div className="grid gap-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Model preset</span>
              <Select value={runtimeModelPickerValue} onValueChange={handleModelPickerChange}>
                <SelectTrigger aria-label="Model preset" className="h-9 border-primary/50 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNSET_MODEL_PICKER_VALUE}>Choose a model</SelectItem>
                  {ASK_KILIAN_MODEL_PRESETS.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.label} · {model.id}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_MODEL_PICKER_VALUE}>Custom model id</SelectItem>
                </SelectContent>
              </Select>
              {runtimeModelPickerValue && runtimeModelPickerValue !== CUSTOM_MODEL_PICKER_VALUE ? (
                <p className="text-xs text-muted-foreground">
                  {ASK_KILIAN_MODEL_PRESETS.find(model => model.id === runtimeModelPickerValue)?.detail}
                </p>
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Model id</span>
              <input
                className={adminSmallInputClassName}
                readOnly={runtimeModelPickerValue !== CUSTOM_MODEL_PICKER_VALUE}
                value={runtimeModelId}
                onChange={event => setRuntimeModelId(event.target.value)}
              />
            </label>
          </div>

          <details
            className="group/prompt border-t border-border/80 pt-3"
            open={promptSetupOpen}
            onToggle={event => setPromptSetupOpen(event.currentTarget.open)}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:hidden">
              <span className="text-sm font-semibold">Prompt</span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-open/prompt:rotate-180"
              />
            </summary>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Prompt title</span>
                <input
                  className={adminSmallInputClassName}
                  value={promptConfigTitle}
                  onChange={event => setPromptConfigTitle(event.target.value)}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Active system prompt</span>
                <textarea
                  className={cn(adminTextareaClassName, 'min-h-40 resize-y')}
                  value={promptConfigText}
                  onChange={event => setPromptConfigText(event.target.value)}
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Notes</span>
                <input
                  className={adminSmallInputClassName}
                  value={promptConfigNotes}
                  onChange={event => setPromptConfigNotes(event.target.value)}
                />
              </label>
              <div>
                <Button type="button" size="sm" disabled={workspace.isPending} onClick={handleSavePromptConfig}>
                  Save prompt
                </Button>
              </div>
            </div>
          </details>

          <details className="group/limits border-t border-border/80 pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:hidden">
              <span className="text-sm font-semibold">Limits and generation settings</span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-open/limits:rotate-180"
              />
            </summary>
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="grid min-w-40 flex-1 gap-2">
                <span className="text-sm font-medium">Max tokens</span>
                <input
                  className={adminSmallInputClassName}
                  type="number"
                  min={1}
                  value={runtimeMaxOutputTokens}
                  onChange={event => setRuntimeMaxOutputTokens(Number(event.target.value))}
                />
              </label>
              <label className="grid min-w-40 flex-1 gap-2">
                <span className="text-sm font-medium">Temperature</span>
                <input
                  className={adminSmallInputClassName}
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={runtimeTemperature}
                  onChange={event => setRuntimeTemperature(Number(event.target.value))}
                />
              </label>
              <label className="grid min-w-40 flex-1 gap-2">
                <span className="text-sm font-medium">RAG limit</span>
                <input
                  className={adminSmallInputClassName}
                  type="number"
                  min={MIN_RETRIEVAL_LIMIT}
                  max={MAX_RETRIEVAL_LIMIT}
                  value={runtimeRagLimit}
                  onChange={event => setRuntimeRagLimit(clampRetrievalLimit(event.target.value))}
                />
              </label>
              <label className="grid min-w-40 flex-1 gap-2">
                <span className="text-sm font-medium">Window</span>
                <input
                  className={adminSmallInputClassName}
                  type="number"
                  min={1}
                  value={runtimeConversationWindow}
                  onChange={event => setRuntimeConversationWindow(Number(event.target.value))}
                />
              </label>
              <label className="grid min-w-40 flex-1 gap-2">
                <span className="text-sm font-medium">Admin daily</span>
                <input
                  className={adminSmallInputClassName}
                  type="number"
                  min={1}
                  value={runtimeAdminDailyRequests}
                  onChange={event => setRuntimeAdminDailyRequests(Number(event.target.value))}
                />
              </label>
              <label className="grid min-w-40 flex-1 gap-2">
                <span className="text-sm font-medium">Public daily</span>
                <input
                  className={adminSmallInputClassName}
                  type="number"
                  min={1}
                  value={runtimePublicDailyRequests}
                  onChange={event => setRuntimePublicDailyRequests(Number(event.target.value))}
                />
              </label>
              <label className="grid min-w-60 flex-[2_1_20rem] gap-2">
                <span className="text-sm font-medium">Public token budget</span>
                <input
                  className={adminSmallInputClassName}
                  type="number"
                  min={1}
                  value={runtimePublicDailyEstimatedTokens}
                  onChange={event => setRuntimePublicDailyEstimatedTokens(Number(event.target.value))}
                />
              </label>
            </div>
          </details>

          <details className="group/overrides border-t border-border/80 pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:hidden">
              <span className="text-sm font-semibold">One-off test overrides</span>
              <ChevronDown
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-open/overrides:rotate-180"
              />
            </summary>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-2">
                <span className="text-sm font-medium">Prompt override</span>
                <textarea
                  className={cn(adminTextareaClassName, 'min-h-24 resize-y')}
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
          </details>

          {configError ? <AdminAlert>{configError}</AdminAlert> : null}
          <div>
            <Button type="button" size="sm" disabled={workspace.isPending} onClick={handleSaveRuntimeConfig}>
              Save runtime
            </Button>
          </div>
        </div>
      </details>

      <details
        className="group rounded-md border border-border bg-background"
        open={contextDebugOpen}
        onToggle={event => setContextDebugOpen(event.currentTarget.open)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden">
          <span>
            <span className="block text-sm font-semibold">Context and debug output</span>
            <span className="block text-xs text-muted-foreground">
              Retrieved RAG context, assembled preview, trace, and diagnostics
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="border-t border-border p-4">
          <ContextPreviewPanel preview={workspace.retrievalPreview} chatResponse={workspace.chatResponse} />
        </div>
      </details>
    </AdminPanel>
  )
}
