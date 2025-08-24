/**
 * UI-only use case for notification management
 * This handles notification queuing and display logic
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export class ShowNotificationUseCase {
  private notifications: Notification[] = []
  private subscribers: ((notifications: Notification[]) => void)[] = []

  showSuccess(message: string, duration = 5000): string {
    return this.addNotification({
      id: this.generateId(),
      type: 'success',
      message,
      duration
    })
  }

  showError(message: string, duration = 8000): string {
    return this.addNotification({
      id: this.generateId(),
      type: 'error',
      message,
      duration
    })
  }

  showWarning(message: string, duration = 6000): string {
    return this.addNotification({
      id: this.generateId(),
      type: 'warning',
      message,
      duration
    })
  }

  showInfo(message: string, duration = 4000): string {
    return this.addNotification({
      id: this.generateId(),
      type: 'info',
      message,
      duration
    })
  }

  dismiss(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id)
    this.notifySubscribers()
  }

  subscribe(callback: (notifications: Notification[]) => void): () => void {
    this.subscribers.push(callback)
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback)
    }
  }

  private addNotification(notification: Notification): string {
    this.notifications.push(notification)
    this.notifySubscribers()

    // Auto-dismiss after duration
    if (notification.duration) {
      setTimeout(() => {
        this.dismiss(notification.id)
      }, notification.duration)
    }

    return notification.id
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback([...this.notifications]))
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
