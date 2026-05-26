import { cn } from '@/utils/utils'
import type { ReactNode } from 'react'

type AdminShellProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function AdminShell({ title, description, children, className }: AdminShellProps) {
  return (
    <div className={cn('px-10 py-16 md:px-20 lg:px-40', className)}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 overflow-hidden rounded-3xl bg-transparent p-6 shadow-none backdrop-blur-2xs">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </div>
    </div>
  )
}
