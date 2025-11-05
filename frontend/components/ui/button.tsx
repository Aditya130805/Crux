import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] hover:opacity-90 shadow-sm",
        secondary: "bg-[rgb(var(--secondary))] text-[rgb(var(--secondary-foreground))] hover:opacity-80 border border-[rgb(var(--border))]",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
        outline: "border border-[rgb(var(--border))] bg-transparent hover:bg-[rgb(var(--accent))] text-[rgb(var(--foreground))]",
        ghost: "hover:bg-[rgb(var(--accent))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]",
        link: "text-[rgb(var(--foreground))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
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
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
