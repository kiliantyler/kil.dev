'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { AskKilianAdminStatus } from '@/lib/ask-kilian/admin-workspace'
import { cn } from '@/utils/utils'

function statusDotClass(level: AskKilianAdminStatus['level']) {
  if (level === 'ready') return 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]'
  if (level === 'unavailable') return 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]'
  return 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
}

export function AskKilianStatusLights({ statuses }: { statuses: AskKilianAdminStatus[] }) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-3 text-sm" aria-label="Ask Kilian admin status">
        {statuses.map(status => (
          <div key={status.label} className="inline-flex items-center gap-2">
            <span className="font-medium">{status.label}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="status"
                  aria-label={`${status.label}: ${status.reason}`}
                  className={cn('size-2.5 rounded-full', statusDotClass(status.level))}
                />
              </TooltipTrigger>
              <TooltipContent>{status.reason}</TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>
    </TooltipProvider>
  )
}
