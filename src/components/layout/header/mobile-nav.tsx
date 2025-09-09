'use client'

import { MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { NAVIGATION } from '@/lib/navmenu'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const pathname = usePathname()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation menu" className="md:hidden">
          <MenuIcon className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-48 p-1 md:hidden">
        {NAVIGATION.map(item => {
          const isActive = !item.href.startsWith('#') && item.href === pathname
          const isExternal = item.href.startsWith('http')
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                  'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                  isActive ? 'bg-accent/50 text-accent-foreground' : 'text-muted-foreground',
                )}
                aria-current={isActive ? 'page' : undefined}
                {...(isExternal && {
                  target: '_blank' as const,
                  rel: 'noopener noreferrer',
                })}>
                {item.label}
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
