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

type BottomDrawerProps = React.ComponentPropsWithoutRef<typeof Drawer>
type DrawerElement = React.ElementRef<typeof Drawer>

const BottomDrawer = React.forwardRef<DrawerElement, BottomDrawerProps>(
  ({ direction: _ignoredDirection, ...rest }, ref) => (
    <Drawer ref={ref} direction="bottom" {...rest} />
  ),
)
BottomDrawer.displayName = 'BottomDrawer'

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
