import { Button, type buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { VariantProps } from 'class-variance-authority'
import * as React from 'react'

interface LinkButtonProps
  extends Omit<React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>, 'asChild'> {
  href: string
  external?: boolean
  children: React.ReactNode
  className?: string
}

export function LinkButton({ href, external = false, children, className, ...props }: LinkButtonProps) {
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <Button asChild className={cn(className)} {...props}>
      <a href={href} {...linkProps}>
        {children}
      </a>
    </Button>
  )
}
