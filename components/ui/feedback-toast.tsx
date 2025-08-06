"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type FeedbackType = "success" | "error" | "warning" | "info"

export interface FeedbackToastProps {
  type: FeedbackType
  title: string
  message?: string
  duration?: number
  onClose?: () => void
  className?: string
}

// Create context for feedback
interface FeedbackContextType {
  showFeedback: (feedback: Omit<FeedbackToastProps, 'onClose'>) => void
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string) => void
  showWarning: (title: string, message?: string) => void
  showInfo: (title: string, message?: string) => void
  clearAll: () => void
}

const FeedbackContext = createContext<FeedbackContextType | null>(null)

const feedbackConfig = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-800",
    iconColor: "text-green-600",
    glowColor: "shadow-green-200/50",
  },
  error: {
    icon: XCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-800",
    iconColor: "text-red-600",
    glowColor: "shadow-red-200/50",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-800",
    iconColor: "text-yellow-600",
    glowColor: "shadow-yellow-200/50",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
    iconColor: "text-blue-600",
    glowColor: "shadow-blue-200/50",
  },
}

export function FeedbackToast({
  type,
  title,
  message,
  duration = 3000,
  onClose,
  className,
}: FeedbackToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const config = feedbackConfig[type]
  const Icon = config.icon

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onClose?.(), 300) // Wait for fade out animation
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[9999] max-w-sm w-full p-4 rounded-lg border-2 shadow-2xl transition-all duration-300 ease-in-out backdrop-blur-sm",
        config.bgColor,
        config.borderColor,
        config.glowColor,
        "animate-in slide-in-from-bottom-full fade-in-0",
        "hover:scale-105 transition-transform",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", config.iconColor)} />
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-medium text-sm", config.textColor)}>
            {title}
          </h4>
          {message && (
            <p className={cn("text-sm mt-1", config.textColor)}>
              {message}
            </p>
          )}
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onClose?.(), 300)
          }}
          className={cn(
            "p-1 rounded-md hover:bg-black/5 transition-colors",
            config.textColor
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// Hook for managing feedback toasts
export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider')
  }
  return context
}

// Feedback provider component for global state
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Array<FeedbackToastProps & { id: string }>>([])

  const showFeedback = (feedback: Omit<FeedbackToastProps, 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = {
      ...feedback,
      id,
      onClose: () => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
      }
    }
    setToasts(prev => [...prev, newToast])
  }

  const showSuccess = (title: string, message?: string) => {
    showFeedback({ type: 'success', title, message })
  }

  const showError = (title: string, message?: string) => {
    showFeedback({ type: 'error', title, message })
  }

  const showWarning = (title: string, message?: string) => {
    showFeedback({ type: 'warning', title, message })
  }

  const showInfo = (title: string, message?: string) => {
    showFeedback({ type: 'info', title, message })
  }

  const clearAll = () => {
    setToasts([])
  }

  const contextValue: FeedbackContextType = {
    showFeedback,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll,
  }

  return (
    <FeedbackContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <FeedbackToast
            key={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
            onClose={toast.onClose}
          />
        ))}
      </div>
    </FeedbackContext.Provider>
  )
} 