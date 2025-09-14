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

function BottomDrawer({ ...props }: BottomDrawerProps) {
  return <Drawer direction="bottom" {...props} />
}

type BottomDrawerContentProps = React.ComponentProps<typeof DrawerContent> & {
  showHandle?: boolean
}

function BottomDrawerContent({ className, showHandle = true, ...props }: BottomDrawerContentProps) {
  return (
    <DrawerContent
      showHandle={showHandle}
      className={cn('sm:max-w-2xl mx-auto rounded-t-xl !border-t-0', className)}
      {...props}
    />
  )
}

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
