import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Badges use container colors per design spec - "Growth Chip" uses secondary-container for success states
const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary-container text-primary-on-container",
        // "Growth" Chip - Teal for success/growth signals
        secondary:
          "bg-secondary-container text-secondary-on-container",
        destructive:
          "bg-destructive-container text-destructive",
        warning:
          "bg-warning-container text-warning",
        success:
          "bg-success-container text-success",
        outline: "bg-surface-container text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
