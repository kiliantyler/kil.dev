import { describe, expect, test } from 'vitest'
import {
  ASK_KILIAN_CHAT_MESSAGE_CONTENT_CLASS,
  getAskKilianChatRoleLabel,
  shouldSubmitAskKilianChatComposer,
} from './chat-panel'

describe('getAskKilianChatRoleLabel', () => {
  test('returns user-facing labels for reusable chat bubbles', () => {
    expect(getAskKilianChatRoleLabel('user')).toBe('You')
    expect(getAskKilianChatRoleLabel('assistant')).toBe('Ask Kilian')
  })
})

describe('shouldSubmitAskKilianChatComposer', () => {
  test('submits on plain Enter', () => {
    expect(shouldSubmitAskKilianChatComposer({ key: 'Enter' })).toBe(true)
  })

  test('does not submit on newline or composition key paths', () => {
    expect(shouldSubmitAskKilianChatComposer({ key: 'Enter', shiftKey: true })).toBe(false)
    expect(shouldSubmitAskKilianChatComposer({ key: 'Enter', metaKey: true })).toBe(false)
    expect(shouldSubmitAskKilianChatComposer({ key: 'Enter', ctrlKey: true })).toBe(false)
    expect(shouldSubmitAskKilianChatComposer({ key: 'Enter', altKey: true })).toBe(false)
    expect(shouldSubmitAskKilianChatComposer({ key: 'Enter', isComposing: true })).toBe(false)
    expect(shouldSubmitAskKilianChatComposer({ key: 'a' })).toBe(false)
  })
})

describe('ASK_KILIAN_CHAT_MESSAGE_CONTENT_CLASS', () => {
  test('wraps long chat tokens while preserving multiline message whitespace', () => {
    expect(ASK_KILIAN_CHAT_MESSAGE_CONTENT_CLASS.split(' ')).toEqual(
      expect.arrayContaining(['whitespace-pre-wrap', 'wrap-anywhere', 'max-w-full']),
    )
  })
})
