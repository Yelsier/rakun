import * as React from 'react'
import { Slot as SlotPrimitive } from 'radix-ui'

import { cn } from '../../lib/utils'

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? SlotPrimitive.Slot : 'div'
  return (
    <Comp
      ref={ref}
      data-slot="scroll-area"
      className={cn('overflow-auto scrollbar-thin', className)}
      {...props}
    />
  )
})

ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
