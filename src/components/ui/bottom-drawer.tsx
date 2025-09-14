'use client'

import * as React from 'react'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

type BottomDrawerProps = React.ComponentProps<typeof Drawer>

function BottomDrawer({ direction: _ignoredDirection, fixed, ...rest }: BottomDrawerProps) {
  return <Drawer {...rest} direction="bottom" fixed={fixed} />
}

type BottomDrawerContentProps = React.ComponentProps<typeof DrawerContent> & {
  showHandle?: boolean
}

const BottomDrawerContent = React.forwardRef<HTMLDivElement, BottomDrawerContentProps>(
  ({ className, showHandle = true, ...props }, ref) => (
    <DrawerContent
      ref={ref}
      showHandle={showHandle}
      className={cn('sm:max-w-2xl mx-auto rounded-t-xl !border-t-0', className)}
      {...props}
    />
  ),
)
BottomDrawerContent.displayName = 'BottomDrawerContent'

export {
  BottomDrawer,
  DrawerClose as BottomDrawerClose,
  BottomDrawerContent,
  DrawerDescription as BottomDrawerDescription,
  DrawerFooter as BottomDrawerFooter,
  DrawerHeader as BottomDrawerHeader,
  DrawerTitle as BottomDrawerTitle,
  DrawerTrigger as BottomDrawerTrigger,
}
