'use client'

import { Button } from '@/components/ui/button'
import type { AskKilianChatMessage } from '@/lib/ask-kilian/chat-contracts'
import { cn } from '@/utils/utils'
import { Bot, Send, Trash2, UserRound } from 'lucide-react'
import { useEffect, useRef, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'

export type AskKilianChatComposerKeyInput = {
  key: string
  shiftKey?: boolean
  metaKey?: boolean
  ctrlKey?: boolean
  altKey?: boolean
  isComposing?: boolean
}

export function getAskKilianChatRoleLabel(role: AskKilianChatMessage['role']) {
  return role === 'user' ? 'You' : 'Ask Kilian'
}

export function shouldSubmitAskKilianChatComposer(input: AskKilianChatComposerKeyInput) {
  return (
    input.key === 'Enter' && !input.shiftKey && !input.metaKey && !input.ctrlKey && !input.altKey && !input.isComposing
  )
}

export const ASK_KILIAN_CHAT_MESSAGE_CONTENT_CLASS =
  'max-w-full rounded-md px-3 py-2 text-sm leading-6 whitespace-pre-wrap wrap-anywhere shadow-sm'

export function AskKilianChatPanel({
  title = 'Ask Kilian',
  subtitle,
  messages,
  value,
  onValueChange,
  onSubmit,
  onClear,
  controls,
  secondaryActions,
  alerts,
  disabled = false,
  isResponding = false,
  placeholder = 'Ask Kilian anything about the site...',
  emptyTitle = 'Start a conversation',
  emptyDescription = 'Ask about projects, career, site lore, pets, or achievement hints.',
  submitLabel = 'Send',
  className,
}: {
  title?: string
  subtitle?: string
  messages: AskKilianChatMessage[]
  value: string
  onValueChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClear?: () => void
  controls?: ReactNode
  secondaryActions?: ReactNode
  alerts?: ReactNode
  disabled?: boolean
  isResponding?: boolean
  placeholder?: string
  emptyTitle?: string
  emptyDescription?: string
  submitLabel?: string
  className?: string
}) {
  const transcriptRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const hasInput = value.trim().length > 0

  useEffect(() => {
    const transcript = transcriptRef.current
    if (!transcript) return
    transcript.scrollTo({ top: transcript.scrollHeight })
  }, [messages.length])

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!shouldSubmitAskKilianChatComposer(event)) return
    event.preventDefault()
    formRef.current?.requestSubmit()
  }

  return (
    <section
      className={cn(
        'flex min-h-[min(44rem,calc(100vh-11rem))] min-w-0 flex-col overflow-hidden rounded-md border border-border bg-background shadow-sm',
        className,
      )}
      aria-label="Ask Kilian chat">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {onClear ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={disabled || messages.length === 0}
            onClick={onClear}
            aria-label="Clear chat">
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        ) : null}
      </div>

      <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length > 0 ? (
          <div className="grid min-h-full content-end gap-4">
            {messages.map((message, index) => (
              <AskKilianMessageBubble
                key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
                message={message}
              />
            ))}
            {isResponding ? <AskKilianTypingBubble /> : null}
          </div>
        ) : (
          <AskKilianEmptyChat title={emptyTitle} description={emptyDescription} />
        )}
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="border-t border-border bg-muted/20 p-3">
        <div className="rounded-md border border-primary/50 bg-background shadow-sm focus-within:ring-2 focus-within:ring-primary/25">
          <textarea
            aria-label="Message Ask Kilian"
            className="min-h-24 w-full resize-none bg-transparent px-3 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground"
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            onChange={event => onValueChange(event.target.value)}
            onKeyDown={handleComposerKeyDown}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 px-2 py-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">{controls}</div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {secondaryActions}
              <Button type="submit" disabled={disabled || !hasInput} className="gap-2">
                <Send aria-hidden="true" className="size-4" />
                {submitLabel}
              </Button>
            </div>
          </div>
        </div>
        {alerts ? <div className="mt-3 grid gap-2">{alerts}</div> : null}
      </form>
    </section>
  )
}

function AskKilianTypingBubble() {
  return (
    <article className="flex gap-3" aria-live="polite">
      <AskKilianMessageAvatar role="assistant" />
      <div className="grid max-w-[min(42rem,88%)] justify-items-start gap-1">
        <p className="text-xs font-medium text-muted-foreground">Ask Kilian</p>
        <div className="flex items-center gap-1 rounded-md border border-border bg-muted/50 px-3 py-3 shadow-sm">
          <span className="size-1.5 rounded-full bg-muted-foreground/70" />
          <span className="size-1.5 rounded-full bg-muted-foreground/50" />
          <span className="size-1.5 rounded-full bg-muted-foreground/30" />
        </div>
      </div>
    </article>
  )
}

function AskKilianMessageBubble({ message }: { message: AskKilianChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <article className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {isUser ? null : <AskKilianMessageAvatar role={message.role} />}
      <div className={cn('grid max-w-[min(42rem,88%)] gap-1', isUser ? 'justify-items-end' : 'justify-items-start')}>
        <p className="text-xs font-medium text-muted-foreground">{getAskKilianChatRoleLabel(message.role)}</p>
        <div
          className={cn(
            ASK_KILIAN_CHAT_MESSAGE_CONTENT_CLASS,
            isUser ? 'bg-primary text-primary-foreground' : 'border border-border bg-muted/50 text-foreground',
          )}>
          {message.content}
        </div>
      </div>
      {isUser ? <AskKilianMessageAvatar role={message.role} /> : null}
    </article>
  )
}

function AskKilianMessageAvatar({ role }: { role: AskKilianChatMessage['role'] }) {
  const Icon = role === 'user' ? UserRound : Bot

  return (
    <div
      aria-hidden="true"
      className={cn(
        'mt-5 flex size-8 shrink-0 items-center justify-center rounded-md border',
        role === 'user' ? 'border-primary/40 bg-primary/10' : 'border-border bg-muted/60',
      )}>
      <Icon className="size-4" />
    </div>
  )
}

function AskKilianEmptyChat({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full min-h-64 items-center justify-center text-center">
      <div className="grid max-w-md justify-items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-md border border-border bg-muted/60">
          <Bot aria-hidden="true" className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  )
}
