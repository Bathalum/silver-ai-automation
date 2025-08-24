/**
 * Data access bridge for user-related operations
 * This connects presentation layer to application use cases
 */

// These interfaces would be imported from lib/use-cases when implemented
interface CreateUserUseCase {
  execute(userData: CreateUserRequest): Promise<User>
}

interface GetUserUseCase {
  execute(userId: string): Promise<User | null>
}

interface UpdateUserUseCase {
  execute(userId: string, userData: UpdateUserRequest): Promise<User>
}

interface DeleteUserUseCase {
  execute(userId: string): Promise<void>
}

// Domain models (would be imported from lib/domain/entities)
interface User {
  id: string
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
}

// Application layer DTOs
interface CreateUserRequest {
  email: string
  name: string
  password: string
}

interface UpdateUserRequest {
  name?: string
  email?: string
}

// UI-specific display models
export interface UserDisplayModel {
  id: string
  name: string
  email: string
  displayName: string
  initials: string
  createdAt: string
  updatedAt: string
}

// UI form models
export interface UserFormData {
  name: string
  email: string
  password?: string
}

// UI services
export interface NotificationService {
  showSuccess(message: string): void
  showError(message: string): void
}

export class UserOperationsPresenter {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private getUserUseCase: GetUserUseCase,
    private updateUserUseCase: UpdateUserUseCase,
    private deleteUserUseCase: DeleteUserUseCase,
    private notificationService: NotificationService
  ) {}

  async createUser(formData: UserFormData): Promise<UserDisplayModel> {
    try {
      // Convert UI model to domain model
      const userData: CreateUserRequest = {
        email: formData.email,
        name: formData.name,
        password: formData.password || ''
      }

      // Call application use case
      const user = await this.createUserUseCase.execute(userData)

      // Show UI feedback
      this.notificationService.showSuccess('User created successfully')

      // Convert domain model to UI model
      return this.mapToDisplayModel(user)
    } catch (error) {
      // Handle errors with user-friendly messages
      const message = error instanceof Error ? error.message : 'Failed to create user'
      this.notificationService.showError(message)
      throw error
    }
  }

  async getUser(userId: string): Promise<UserDisplayModel | null> {
    try {
      const user = await this.getUserUseCase.execute(userId)
      return user ? this.mapToDisplayModel(user) : null
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get user'
      this.notificationService.showError(message)
      throw error
    }
  }

  async updateUser(userId: string, formData: Partial<UserFormData>): Promise<UserDisplayModel> {
    try {
      // Convert UI model to domain model
      const userData: UpdateUserRequest = {
        name: formData.name,
        email: formData.email
      }

      // Call application use case
      const user = await this.updateUserUseCase.execute(userId, userData)

      // Show UI feedback
      this.notificationService.showSuccess('User updated successfully')

      // Convert domain model to UI model
      return this.mapToDisplayModel(user)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user'
      this.notificationService.showError(message)
      throw error
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.deleteUserUseCase.execute(userId)
      this.notificationService.showSuccess('User deleted successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user'
      this.notificationService.showError(message)
      throw error
    }
  }

  private mapToDisplayModel(user: User): UserDisplayModel {
    const initials = user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      displayName: `${user.name} (${user.email})`,
      initials,
      createdAt: user.createdAt.toLocaleDateString(),
      updatedAt: user.updatedAt.toLocaleDateString()
    }
  }
}
