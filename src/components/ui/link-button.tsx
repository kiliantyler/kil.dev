import { Button, type buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { VariantProps } from 'class-variance-authority'
import type { Route } from 'next'
import Link from 'next/link'
import * as React from 'react'

interface LinkButtonProps
  extends Omit<React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>, 'asChild'> {
  href: Route
  external?: boolean
  children: React.ReactNode
  className?: string
}

export function LinkButton({ href, external = false, children, className, ...props }: LinkButtonProps) {
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <Button asChild className={cn(className)} {...props}>
      <Link href={href} {...linkProps}>
        {children}
      </Link>
    </Button>
  )
}
