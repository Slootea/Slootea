import * as React from "react"

import { cn } from "@/lib/utils"

// No border per design spec - use surface fill like Input
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg bg-surface-container-highest px-4 py-3 text-base transition-all",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-surface-bright",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "md:text-sm resize-none",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
