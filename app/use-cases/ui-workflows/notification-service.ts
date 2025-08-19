// UI Workflow Service - Presentation Layer
// Following Clean Architecture: UI-specific use case for notification management

/**
 * Notification Service - Pure UI Workflow
 * 
 * This service handles UI-only workflows related to user notifications.
 * It follows Clean Architecture by being:
 * 1. UI-focused - no business logic
 * 2. Interface-based - can be mocked for testing
 * 3. Dependency-injected - can use different implementations
 */

export interface NotificationMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number // milliseconds, undefined = manual dismiss
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: () => void
  style?: 'primary' | 'secondary' | 'destructive'
}

export interface NotificationState {
  notifications: NotificationMessage[]
  maxNotifications: number
  defaultDuration: number
  defaultPosition: string
}

/**
 * Interface for Notification Storage
 * Allows different implementations (localStorage, sessionStorage, memory)
 */
export interface NotificationStorage {
  save(notifications: NotificationMessage[]): void
  load(): NotificationMessage[]
  clear(): void
}

/**
 * Interface for Notification Display
 * Allows different UI implementations (toast, modal, banner)
 */
export interface NotificationDisplay {
  show(notification: NotificationMessage): void
  hide(notificationId: string): void
  clear(): void
  updatePosition(position: string): void
}

/**
 * Notification Service Implementation
 * Handles all notification-related UI workflows
 */
export class NotificationService {
  private state: NotificationState
  private listeners: Set<(state: NotificationState) => void> = new Set()

  constructor(
    private storage: NotificationStorage,
    private display: NotificationDisplay,
    private config: {
      maxNotifications?: number
      defaultDuration?: number
      defaultPosition?: string
      persistNotifications?: boolean
    } = {}
  ) {
    this.state = {
      notifications: config.persistNotifications ? storage.load() : [],
      maxNotifications: config.maxNotifications || 5,
      defaultDuration: config.defaultDuration || 5000,
      defaultPosition: config.defaultPosition || 'top-right'
    }
  }

  /**
   * Show a success notification
   */
  showSuccess(message: string, options?: Partial<NotificationMessage>): string {
    return this.show({
      type: 'success',
      message,
      ...options
    })
  }

  /**
   * Show an error notification
   */
  showError(message: string, options?: Partial<NotificationMessage>): string {
    return this.show({
      type: 'error',
      message,
      duration: undefined, // Errors require manual dismiss
      ...options
    })
  }

  /**
   * Show a warning notification
   */
  showWarning(message: string, options?: Partial<NotificationMessage>): string {
    return this.show({
      type: 'warning',
      message,
      ...options
    })
  }

  /**
   * Show an info notification
   */
  showInfo(message: string, options?: Partial<NotificationMessage>): string {
    return this.show({
      type: 'info',
      message,
      ...options
    })
  }

  /**
   * Show a notification with full control
   */
  show(notification: Partial<NotificationMessage>): string {
    const id = notification.id || this.generateId()
    
    const fullNotification: NotificationMessage = {
      id,
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message || '',
      duration: notification.duration !== undefined ? notification.duration : this.state.defaultDuration,
      position: notification.position || this.state.defaultPosition,
      actions: notification.actions
    }

    // Add to state
    this.state.notifications.push(fullNotification)

    // Limit number of notifications
    if (this.state.notifications.length > this.state.maxNotifications) {
      const removed = this.state.notifications.shift()
      if (removed) {
        this.display.hide(removed.id)
      }
    }

    // Show in display
    this.display.show(fullNotification)

    // Auto-dismiss if duration is set
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        this.dismiss(id)
      }, fullNotification.duration)
    }

    // Persist if enabled
    this.persistState()

    // Notify listeners
    this.notifyListeners()

    return id
  }

  /**
   * Dismiss a specific notification
   */
  dismiss(notificationId: string): void {
    const index = this.state.notifications.findIndex(n => n.id === notificationId)
    if (index >= 0) {
      this.state.notifications.splice(index, 1)
      this.display.hide(notificationId)
      this.persistState()
      this.notifyListeners()
    }
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    this.state.notifications = []
    this.display.clear()
    this.persistState()
    this.notifyListeners()
  }

  /**
   * Get current notifications
   */
  getNotifications(): NotificationMessage[] {
    return [...this.state.notifications]
  }

  /**
   * Get current state
   */
  getState(): NotificationState {
    return { ...this.state }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: NotificationState) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Update notification settings
   */
  updateSettings(settings: {
    maxNotifications?: number
    defaultDuration?: number
    defaultPosition?: string
  }): void {
    if (settings.maxNotifications !== undefined) {
      this.state.maxNotifications = settings.maxNotifications
    }
    if (settings.defaultDuration !== undefined) {
      this.state.defaultDuration = settings.defaultDuration
    }
    if (settings.defaultPosition !== undefined) {
      this.state.defaultPosition = settings.defaultPosition
      this.display.updatePosition(settings.defaultPosition)
    }

    this.persistState()
    this.notifyListeners()
  }

  /**
   * Show a notification with action buttons
   */
  showWithActions(
    message: string,
    actions: NotificationAction[],
    options?: Partial<NotificationMessage>
  ): string {
    return this.show({
      message,
      actions,
      duration: undefined, // Don't auto-dismiss when there are actions
      ...options
    })
  }

  /**
   * Show a confirmation notification
   */
  showConfirmation(
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    options?: Partial<NotificationMessage>
  ): string {
    const actions: NotificationAction[] = [
      {
        label: 'Confirm',
        action: () => {
          onConfirm()
          this.dismiss(id)
        },
        style: 'primary'
      }
    ]

    if (onCancel) {
      actions.push({
        label: 'Cancel',
        action: () => {
          onCancel()
          this.dismiss(id)
        },
        style: 'secondary'
      })
    }

    const id = this.showWithActions(message, actions, {
      type: 'warning',
      ...options
    })

    return id
  }

  /**
   * Show an undo notification
   */
  showUndo(
    message: string,
    onUndo: () => void,
    undoTimeout: number = 10000,
    options?: Partial<NotificationMessage>
  ): string {
    const id = this.showWithActions(
      message,
      [
        {
          label: 'Undo',
          action: () => {
            onUndo()
            this.dismiss(id)
          },
          style: 'primary'
        }
      ],
      {
        type: 'info',
        duration: undoTimeout,
        ...options
      }
    )

    return id
  }

  // Private helper methods

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private persistState(): void {
    try {
      this.storage.save(this.state.notifications)
    } catch (error) {
      console.warn('Failed to persist notifications:', error)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState())
      } catch (error) {
        console.error('Notification listener error:', error)
      }
    })
  }
}

/**
 * Default implementations for storage and display
 */

export class LocalStorageNotificationStorage implements NotificationStorage {
  private key = 'app_notifications'

  save(notifications: NotificationMessage[]): void {
    localStorage.setItem(this.key, JSON.stringify(notifications))
  }

  load(): NotificationMessage[] {
    try {
      const stored = localStorage.getItem(this.key)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  clear(): void {
    localStorage.removeItem(this.key)
  }
}

export class MemoryNotificationStorage implements NotificationStorage {
  private notifications: NotificationMessage[] = []

  save(notifications: NotificationMessage[]): void {
    this.notifications = [...notifications]
  }

  load(): NotificationMessage[] {
    return [...this.notifications]
  }

  clear(): void {
    this.notifications = []
  }
}

/**
 * Factory function to create notification service with sensible defaults
 */
export function createNotificationService(config?: {
  storage?: 'localStorage' | 'memory'
  display?: NotificationDisplay
  maxNotifications?: number
  defaultDuration?: number
  defaultPosition?: string
  persistNotifications?: boolean
}): NotificationService {
  const storage = config?.storage === 'localStorage' 
    ? new LocalStorageNotificationStorage()
    : new MemoryNotificationStorage()

  // Default display implementation would be provided by UI framework
  const display = config?.display || {
    show: (notification) => console.log('Show notification:', notification),
    hide: (id) => console.log('Hide notification:', id),
    clear: () => console.log('Clear all notifications'),
    updatePosition: (position) => console.log('Update position:', position)
  }

  return new NotificationService(storage, display, {
    maxNotifications: config?.maxNotifications,
    defaultDuration: config?.defaultDuration,
    defaultPosition: config?.defaultPosition,
    persistNotifications: config?.persistNotifications
  })
}