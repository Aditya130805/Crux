"use client"

import { createContext, useContext, useState, ReactNode } from 'react'
import { Toast, ToastContainer } from '@/components/ui/toast'

interface ToastMessage {
  id: string
  title?: string
  description?: string
  variant?: "default" | "success" | "error"
}

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const showToast = (newToast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(7)
    setToast({ ...newToast, id })
  }

  const success = (title: string, description?: string) => {
    showToast({ title, description, variant: 'success' })
  }

  const error = (title: string, description?: string) => {
    showToast({ title, description, variant: 'error' })
  }

  const removeToast = () => {
    setToast(null)
  }

  return (
    <ToastContext.Provider value={{ showToast, success, error }}>
      {children}
      <ToastContainer>
        {toast && (
          <Toast
            key={toast.id}
            {...toast}
            onClose={removeToast}
          />
        )}
      </ToastContainer>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
