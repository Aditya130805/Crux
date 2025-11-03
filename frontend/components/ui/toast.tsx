"use client"

import * as React from "react"
import { X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: "default" | "success" | "error"
  duration?: number
  onClose: (id: string) => void
}

export function Toast({ id, title, description, variant = "default", duration = 4000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onClose(id), 300) // Wait for exit animation
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 400, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 400, scale: 0.9 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 35,
        opacity: { duration: 0.2 }
      }}
      className={cn(
        "pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border shadow-2xl",
        variant === "default" && "bg-[rgb(var(--card))] border-[rgb(var(--border))]",
        variant === "success" && "bg-green-600 border-green-500",
        variant === "error" && "bg-red-600 border-red-500"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1">
          {title && (
            <div className={cn(
              "font-semibold text-sm mb-1",
              (variant === "success" || variant === "error") && "text-white",
              variant === "default" && "text-[rgb(var(--foreground))]"
            )}>
              {title}
            </div>
          )}
          {description && (
            <div className={cn(
              "text-sm",
              (variant === "success" || variant === "error") && "text-white/90",
              variant === "default" && "text-[rgb(var(--muted-foreground))]"
            )}>
              {description}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setIsExiting(true)
            setTimeout(() => onClose(id), 300)
          }}
          className={cn(
            "transition-colors",
            (variant === "success" || variant === "error") && "text-white/80 hover:text-white",
            variant === "default" && "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  )
}

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <AnimatePresence mode="wait" initial={false}>
        {children}
      </AnimatePresence>
    </div>
  )
}
