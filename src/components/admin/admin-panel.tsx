'use client'

import { cn } from '@/utils/utils'
import type { ComponentPropsWithoutRef } from 'react'

export const adminInputClassName = 'h-9 rounded-md border border-primary/50 bg-background px-3 text-sm'
export const adminSmallInputClassName =
  'h-8 rounded-md border border-primary/50 bg-background px-2 text-sm text-foreground'
export const adminTextareaClassName = 'rounded-md border border-primary/50 bg-background px-3 py-2 text-sm'
export const adminStatusClassName = 'border-l border-border py-2 pl-3 text-sm'

export function AdminPanel({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  return <section className={cn('border-t border-border/80 pt-5', className)} {...props} />
}

export function AdminAlert({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return (
    <p
      role="alert"
      className={cn('border-l-2 border-destructive py-1 pl-3 text-sm text-destructive', className)}
      {...props}
    />
  )
}
