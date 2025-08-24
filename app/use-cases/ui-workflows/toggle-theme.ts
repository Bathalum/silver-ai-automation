/**
 * UI-only use case for theme switching
 * This handles theme persistence and UI feedback
 */

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeStorage {
  save(theme: Theme): void
  load(): Theme | null
}

export interface NotificationService {
  show(message: string): void
}

export class ToggleThemeUseCase {
  constructor(
    private themeStorage: ThemeStorage,
    private notificationService: NotificationService
  ) {}

  execute(currentTheme: Theme): Theme {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'
    
    // Persist UI preference
    this.themeStorage.save(newTheme)
    
    // Show UI feedback
    this.notificationService.show(`Switched to ${newTheme} theme`)
    
    return newTheme
  }
}
