import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: Gradient fill with "lit from within" polish
        default:
          "bg-gradient-to-br from-primary to-primary-light text-primary-foreground shadow-ambient-sm hover:shadow-ambient hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-ambient-sm hover:bg-destructive/90",
        // Outline: Ghost border style per design spec
        outline:
          "bg-surface shadow-[inset_0_0_0_1px_var(--outline)] hover:bg-surface-container-low hover:shadow-[inset_0_0_0_1px_var(--outline-variant)]",
        // Secondary: Teal/Growth color for positive actions
        secondary:
          "bg-secondary-container text-secondary-on-container hover:bg-secondary-container/80",
        // Tertiary: No background, no border - just text
        ghost: "hover:bg-surface-container text-muted-foreground hover:text-foreground",
        // Tertiary accent variant
        tertiary: "text-primary font-semibold hover:bg-primary-container/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 rounded-lg",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-base font-semibold",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
