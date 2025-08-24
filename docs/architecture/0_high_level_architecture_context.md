# Clean Architecture Design Document

This document establishes the foundational Clean Architecture principles for all projects, ensuring business logic independence, maintainability, and testability. Clean Architecture enforces strict separation of concerns through concentric layers where dependencies flow inward, protecting core business logic from external changes.

## Core Clean Architecture Principles

### The Dependency Rule
**Critical**: Dependencies can only point inward. Inner layers define interfaces; outer layers implement them. No inner layer can know about outer layers.

### Layer Independence
Each layer serves a distinct purpose and can be tested in isolation. Business logic remains independent of frameworks, databases, UI, or external services.

## Clean Architecture Layers (Inside-Out)

### 1. Entities (Innermost - Domain Core)
**Purpose**: Contains enterprise-wide business rules and core business objects.

**What Belongs Here**:
- **Enterprise Business Rules**: Rules that would exist even if the application didn't exist
- **Core Business Objects**: User, Order, Product, etc. with their fundamental properties
- **Business Invariants**: Rules that must always be true (e.g., account balance can't go negative)
- **Business Calculations**: Core mathematical operations and formulas

**What Logic Stays Here**:
- Data validation that reflects business rules (not input validation)
- Business calculations and transformations
- State transitions that follow business rules
- Core domain behaviors that entities must enforce

**Dependencies**: None. Zero external dependencies.

**Example**:
```typescript
// Good: Business rule enforcement with value objects
class Email {
  constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid email format')
    }
  }
  
  toString(): string { return this.value }
  equals(other: Email): boolean { return this.value === other.value }
  
  private isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

class Money {
  constructor(
    private readonly amount: number,
    private readonly currency: string
  ) {
    if (amount < 0) throw new Error("Money cannot be negative")
  }
  
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error("Cannot add different currencies")
    }
    return new Money(this.amount + other.amount, this.currency)
  }
  
  static zero(currency = 'USD'): Money {
    return new Money(0, currency)
  }
}

class Order {
  private items: OrderItem[]
  private status: OrderStatus
  private events: DomainEvent[] = []
  
  addItem(item: OrderItem): void {
    if (this.status === OrderStatus.SHIPPED) {
      throw new Error("Cannot modify shipped order") // Business rule
    }
    this.items.push(item)
    this.addEvent(new OrderItemAdded(this.id, item))
  }
  
  calculateTotal(): Money {
    return this.items.reduce((sum, item) => sum.add(item.price), Money.zero())
  }
  
  private addEvent(event: DomainEvent): void {
    this.events.push(event)
  }
  
  getEvents(): DomainEvent[] {
    return [...this.events]
  }
  
  clearEvents(): void {
    this.events = []
  }
}
```

### 2. Use Cases (Application Business Rules)
**Purpose**: Contains application-specific business rules and orchestrates the flow of data between entities and external interfaces.

**What Belongs Here**:
- **Application-specific workflows**: "Create User Account", "Process Payment"
- **Use case orchestration**: Coordinating multiple entities and services
- **Application business rules**: Rules specific to this application (not enterprise-wide)
- **Data transformation**: Converting between domain models and DTOs

**What Logic Stays Here**:
- Workflow coordination between entities
- Application-specific validation (e.g., duplicate email check)
- Transaction boundaries
- Authorization logic (who can do what)
- Integration orchestration (calling multiple external services)

**Dependencies**: Only Entities layer. Uses repository interfaces (not implementations).

**Example**:
```typescript
// Good: Use case orchestration with Result pattern
class CreateUserUseCase {
  constructor(
    private userRepo: UserRepository, // Interface, not implementation
    private emailService: EmailService, // Interface
    private eventBus: EventBus // Interface
  ) {}
  
  async execute(userData: CreateUserRequest): Promise<Result<User>> {
    try {
      // Application validation
      const existingUser = await this.userRepo.findByEmail(userData.email)
      if (existingUser.isSuccess && existingUser.value) {
        return Result.fail<User>("Email already exists")
      }
      
      // Create entity (business rules enforced)
      const userResult = User.create(userData)
      if (userResult.isFailure) {
        return Result.fail<User>(userResult.error)
      }
      
      const user = userResult.value
      
      // Persist
      const saveResult = await this.userRepo.save(user)
      if (saveResult.isFailure) {
        return Result.fail<User>("Failed to save user")
      }
      
      // Publish domain events
      const events = user.getEvents()
      for (const event of events) {
        await this.eventBus.publish(event)
      }
      user.clearEvents()
      
      // Send notification (fire and forget)
      this.emailService.sendWelcomeEmail(user.email.toString())
        .catch(error => console.error('Failed to send welcome email:', error))
      
      return Result.ok(user)
    } catch (error) {
      return Result.fail<User>(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
```

### Result Pattern for Functional Error Handling

**Purpose**: Provides explicit error handling without exceptions, making error cases part of the type system.

**What It Solves**:
- **Explicit Error Handling**: Forces developers to handle both success and failure cases
- **Type Safety**: Errors become part of the return type, caught at compile time
- **Functional Composition**: Allows chaining operations with automatic error propagation
- **No Hidden Exceptions**: All possible errors are visible in the method signature

**Implementation**:
```typescript
// Core Result pattern implementation
export class Result<T> {
  private constructor(
    private readonly _value?: T,
    private readonly _error?: string,
    private readonly _isSuccess: boolean = false
  ) {}
  
  static ok<T>(value: T): Result<T> {
    return new Result<T>(value, undefined, true)
  }
  
  static fail<T>(error: string): Result<T> {
    return new Result<T>(undefined, error, false)
  }
  
  get isSuccess(): boolean {
    return this._isSuccess
  }
  
  get isFailure(): boolean {
    return !this._isSuccess
  }
  
  get value(): T {
    if (!this._isSuccess) {
      throw new Error("Cannot get value from failed result")
    }
    return this._value!
  }
  
  get error(): string {
    if (this._isSuccess) {
      throw new Error("Cannot get error from successful result")
    }
    return this._error!
  }
  
  // Functional combinators
  map<U>(fn: (value: T) => U): Result<U> {
    if (this.isFailure) {
      return Result.fail<U>(this._error!)
    }
    try {
      return Result.ok(fn(this._value!))
    } catch (error) {
      return Result.fail<U>(error instanceof Error ? error.message : String(error))
    }
  }
  
  flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isFailure) {
      return Result.fail<U>(this._error!)
    }
    return fn(this._value!)
  }
  
  onSuccess(fn: (value: T) => void): Result<T> {
    if (this.isSuccess) {
      fn(this._value!)
    }
    return this
  }
  
  onFailure(fn: (error: string) => void): Result<T> {
    if (this.isFailure) {
      fn(this._error!)
    }
    return this
  }
}

// Usage in domain entities
class User {
  static create(userData: CreateUserRequest): Result<User> {
    // Validate email
    const emailResult = Email.create(userData.email)
    if (emailResult.isFailure) {
      return Result.fail<User>(`Invalid email: ${emailResult.error}`)
    }
    
    // Validate other fields...
    if (!userData.name || userData.name.trim().length === 0) {
      return Result.fail<User>("Name is required")
    }
    
    // Create user if all validations pass
    const user = new User(
      generateId(),
      emailResult.value,
      userData.name.trim()
    )
    
    return Result.ok(user)
  }
}

// Repository interface with Result pattern
interface UserRepository {
  save(user: User): Promise<Result<void>>
  findByEmail(email: string): Promise<Result<User | null>>
  findById(id: string): Promise<Result<User | null>>
}
```

### 3. Interface Adapters
**Purpose**: Converts data between use cases and external layers. Implements interfaces defined by inner layers.

**What Belongs Here**:
- **Controllers**: Handle HTTP requests, convert to use case inputs
- **Presenters**: Format use case outputs for specific UI needs
- **Repository Implementations**: Implement data access interfaces
- **External Service Adapters**: Implement external service interfaces

**What Logic Stays Here**:
- Data format conversion (JSON ↔ Domain objects)
- Input validation (format, type checking, not business rules)
- HTTP status code mapping
- Database query optimization
- External API integration details

**Dependencies**: Use Cases and Entities layers.

**Example**:
```typescript
// Controller (Web Adapter)
class UserController {
  constructor(private createUser: CreateUserUseCase) {}
  
  async createUser(req: Request): Promise<Response> {
    try {
      // Convert HTTP input to use case input
      const userData = this.validateAndMap(req.body)
      
      // Execute use case
      const user = await this.createUser.execute(userData)
      
      // Convert domain result to HTTP response
      return Response.created(this.mapToUserDTO(user))
    } catch (error) {
      return this.handleError(error) // HTTP-specific error handling
    }
  }
}

// Repository Implementation (Database Adapter)
class SqlUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    // Convert domain entity to database format
    const dbUser = this.mapToDbFormat(user)
    await this.db.users.insert(dbUser)
  }
  
  async findByEmail(email: string): Promise<User | null> {
    const dbUser = await this.db.users.findByEmail(email)
    return dbUser ? this.mapToDomain(dbUser) : null
  }
}
```

### Domain Events for Loose Coupling

**Purpose**: Enable loose coupling between aggregates and bounded contexts through event-driven communication.

**What It Solves**:
- **Aggregate Independence**: Aggregates don't need direct references to each other
- **Cross-Cutting Concerns**: Handle side effects (emails, notifications, integrations) without coupling
- **Temporal Decoupling**: Events can be processed immediately or later (eventual consistency)
- **Audit Trail**: Natural event sourcing and audit logging capabilities

**Implementation**:
```typescript
// Base domain event interface
interface DomainEvent {
  eventId: string
  occurredOn: Date
  aggregateId: string
  aggregateType: string
  eventType: string
}

// Concrete domain events
class UserCreated implements DomainEvent {
  readonly eventId = generateId()
  readonly occurredOn = new Date()
  readonly aggregateType = 'User'
  readonly eventType = 'UserCreated'
  
  constructor(
    public readonly aggregateId: string,
    public readonly user: {
      id: string
      email: string
      name: string
    }
  ) {}
}

class OrderItemAdded implements DomainEvent {
  readonly eventId = generateId()
  readonly occurredOn = new Date()
  readonly aggregateType = 'Order'
  readonly eventType = 'OrderItemAdded'
  
  constructor(
    public readonly aggregateId: string,
    public readonly item: {
      productId: string
      quantity: number
      price: number
    }
  ) {}
}

// Entity with domain events
abstract class AggregateRoot {
  private _events: DomainEvent[] = []
  
  protected addEvent(event: DomainEvent): void {
    this._events.push(event)
  }
  
  getEvents(): DomainEvent[] {
    return [...this._events]
  }
  
  clearEvents(): void {
    this._events = []
  }
}

class User extends AggregateRoot {
  constructor(
    public readonly id: string,
    public readonly email: Email,
    public readonly name: string
  ) {
    super()
  }
  
  static create(userData: CreateUserRequest): Result<User> {
    const emailResult = Email.create(userData.email)
    if (emailResult.isFailure) {
      return Result.fail<User>(`Invalid email: ${emailResult.error}`)
    }
    
    const user = new User(
      generateId(),
      emailResult.value,
      userData.name
    )
    
    // Domain event for user creation
    user.addEvent(new UserCreated(user.id, {
      id: user.id,
      email: user.email.toString(),
      name: user.name
    }))
    
    return Result.ok(user)
  }
}

// Event bus interface (defined in use case layer)
interface EventBus {
  publish(event: DomainEvent): Promise<void>
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>
  ): void
}

// Event handlers (application layer)
class SendWelcomeEmailHandler {
  constructor(private emailService: EmailService) {}
  
  async handle(event: UserCreated): Promise<void> {
    await this.emailService.sendWelcomeEmail(
      event.user.email,
      event.user.name
    )
  }
}

class UpdateUserStatisticsHandler {
  constructor(private statisticsRepo: StatisticsRepository) {}
  
  async handle(event: UserCreated): Promise<void> {
    await this.statisticsRepo.incrementUserCount()
  }
}

// Use case with event publishing
class CreateUserUseCase {
  constructor(
    private userRepo: UserRepository,
    private eventBus: EventBus
  ) {}
  
  async execute(userData: CreateUserRequest): Promise<Result<User>> {
    const userResult = User.create(userData)
    if (userResult.isFailure) {
      return userResult
    }
    
    const user = userResult.value
    
    // Save user
    const saveResult = await this.userRepo.save(user)
    if (saveResult.isFailure) {
      return Result.fail<User>("Failed to save user")
    }
    
    // Publish domain events
    const events = user.getEvents()
    for (const event of events) {
      await this.eventBus.publish(event)
    }
    user.clearEvents()
    
    return Result.ok(user)
  }
}
```

### 4. Frameworks & Drivers (Outermost)
**Purpose**: Contains framework-specific code, external services, and infrastructure details.

**What Belongs Here**:
- **Web Frameworks**: Express, FastAPI, Next.js routing
- **Databases**: PostgreSQL, MongoDB connection details
- **External Services**: Payment gateways, email providers
- **UI Frameworks**: React components, view templates
- **Configuration**: Environment variables, framework setup

**Dependencies**: Interface Adapters layer only.

## Critical Distinctions

### Domain Logic vs Application Logic

**Domain Logic (Entities)**:
- "An order cannot be modified after shipping" ← Business invariant
- "User age must be calculated from birth date" ← Business calculation
- "Account balance = deposits - withdrawals" ← Business formula

**Application Logic (Use Cases)**:
- "Check if email exists before creating user" ← Application workflow
- "Send welcome email after user creation" ← Application process
- "Log user creation for audit" ← Application requirement

### When to Create New Layers vs Extend Existing

**Create New Entity When**:
- Represents a core business concept with independent lifecycle
- Has its own business rules and invariants
- Other entities need to reference it

**Extend Use Case When**:
- Adding new application workflow
- Orchestrating existing entities differently
- Adding new external service integration

**Create New Adapter When**:
- Integrating with new external system
- Supporting new presentation format (REST, GraphQL, CLI)
- Different data persistence needs

## Dependency Inversion Implementation

### Interface Definition (Inner Layers)
```typescript
// Use Case Layer - Defines interfaces it needs
interface UserRepository {
  save(user: User): Promise<void>
  findByEmail(email: string): Promise<User | null>
}

// Use Case Layer - Uses interface
class CreateUserUseCase {
  constructor(private userRepo: UserRepository) {} // Depends on interface
}
```

### Interface Implementation (Outer Layers)
```typescript
// Infrastructure Layer - Implements interface
class SqlUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    // Database-specific implementation
  }
}

// Dependency Injection (Framework Layer)
const userRepo = new SqlUserRepository(database)
const createUser = new CreateUserUseCase(userRepo)
```

## Layer Communication Rules

1. **Inward Dependencies Only**: Outer layers depend on inner layers, never reverse
2. **Interface-Based**: Use cases depend on interfaces, not implementations
3. **Data Transformation**: Each layer transforms data to/from its format
4. **Error Handling**: Each layer handles its specific error types
5. **Testing**: Inner layers can be tested without outer layer implementations

## Implementation Checklist

### Core Architecture Compliance
- [ ] Entities contain only business rules and core domain logic
- [ ] Use cases orchestrate workflows without business rule implementation
- [ ] Interfaces are defined in inner layers, implemented in outer layers
- [ ] No entity or use case imports framework-specific code
- [ ] Database/external service details stay in infrastructure layer
- [ ] Controllers handle only HTTP concerns, not business logic
- [ ] Data flows inward as domain objects, outward as DTOs
- [ ] Each layer can be unit tested in isolation

### Advanced Patterns Implementation
- [ ] **Value Objects**: Used for primitive obsession prevention (Email, Money, etc.)
- [ ] **Result Pattern**: Functional error handling without exceptions
- [ ] **Domain Events**: Loose coupling between aggregates and bounded contexts
- [ ] **Aggregate Root**: Entities inherit from AggregateRoot for event management
- [ ] **Event-Driven Architecture**: Cross-cutting concerns handled via events
- [ ] **Functional Combinators**: Result.map(), flatMap() for operation chaining
- [ ] **Explicit Error Handling**: All methods return Result<T> for type-safe errors
- [ ] **Event Sourcing Ready**: Domain events provide natural audit trail

## Project Implementation Guidelines

### Coding Standards
All code must adhere to Clean Architecture principles while maintaining:

- **Single Responsibility**: Each class/function has one reason to change
- **Open/Closed Principle**: Open for extension, closed for modification
- **Dependency Inversion**: Depend on abstractions, not concretions
- **Interface Segregation**: No client should depend on unused methods
- **DRY Principle**: Don't repeat yourself, extract common functionality
- **SOLID Principles**: Foundation for maintainable object-oriented design

### File Organization
```
/lib                           # Clean Architecture Implementation
├── domain/                    # Domain Layer (Entities - Core Business Logic)
│   ├── entities/              # Business entities with enterprise rules
│   └── rules/                 # Business rule validators and calculations
├── use-cases/                 # Application Layer (Use Cases)
│   ├── [feature]/             # Feature-specific use case implementations
│   └── interfaces/            # Repository and service interfaces (defined by use cases)
├── infrastructure/            # Infrastructure Layer (External Concerns)
│   ├── repositories/          # Data access implementations
│   ├── external/              # External service clients
│   └── adapters/              # Framework-specific adapters
├── supabase/                  # Database layer (Infrastructure)
│   ├── client.ts              # Database client configuration
│   ├── server.ts              # Server-side database access
│   └── middleware.ts          # Database middleware
└── utils.ts                   # Shared utilities (framework-agnostic)
```

### Testing Strategy
Each layer must be independently testable:

**Domain Layer Testing**:
- Unit tests for entities and business rules
- No external dependencies (mocks/stubs)
- Focus on business logic correctness

**Use Case Testing**:
- Integration tests with mocked repositories
- Test application workflows end-to-end
- Verify correct domain coordination

**Infrastructure Testing**:
- Test database mapping and external service integration
- Use test databases and service stubs
- Verify interface contract compliance

**Presentation Testing**:
- Test component rendering and user interactions
- Mock use case dependencies
- Focus on UI behavior and data display

### Error Handling Strategy
Each layer handles specific error types using the Result<T> pattern for explicit error handling:

**Domain Layer**: 
- Business rule violations, domain constraint errors
- Returns: `Result<Entity>` from factory methods, `Result<void>` from operations
- Example: `User.create()` returns `Result<User>` with validation errors

**Use Case Layer**: 
- Application workflow errors, authorization failures, coordination errors
- Returns: `Result<T>` from all use case executions
- Example: `CreateUserUseCase.execute()` returns `Result<User>`

**Infrastructure Layer**: 
- Data access errors, external service failures, network timeouts
- Returns: `Result<T>` from repository and service operations
- Example: `UserRepository.save()` returns `Result<void>`

**Presentation Layer**: 
- Input validation errors, HTTP status mapping, format conversion errors
- Converts `Result<T>` to HTTP responses with appropriate status codes
- Example: Success → 200/201, Failure → 400/500 with error details

**Advanced Error Handling Patterns**:
```typescript
// Functional error composition
const result = await userRepository.findByEmail(email)
  .flatMap(user => user ? Result.ok(user) : Result.fail("User not found"))
  .flatMap(user => user.updateProfile(profileData))
  .flatMap(user => userRepository.save(user))

// Error handling with context
result
  .onSuccess(user => logger.info(`User ${user.id} updated successfully`))
  .onFailure(error => logger.error(`Failed to update user: ${error}`))

// HTTP response mapping
return result.isSuccess
  ? Response.ok(result.value)
  : Response.badRequest({ error: result.error })
```

### Data Flow Patterns
1. **Inbound**: Request → Controller → Use Case → Entity → Repository
2. **Outbound**: Repository → Entity → Use Case → Presenter → Response
3. **Cross-Cutting**: Use Case → Multiple External Services (via interfaces)
4. **Validation**: Input Validation (Adapter) → Business Validation (Entity)

## Presentation Layer Architecture (Frontend)

The Presentation Layer in Clean Architecture is responsible for user interface concerns and should remain isolated from business logic. It communicates with the Application Layer (Use Cases) through well-defined interfaces.

### Presentation Layer Structure
```
/app                          # Next.js App Router (Framework Layer)
├── (auth)/                   # Authentication route group
│   ├── login/                # Login page
│   ├── signup/               # Registration page
│   ├── callback/             # OAuth callback
│   └── layout.tsx            # Auth-specific layout
├── (private)/                # Protected route group (requires authentication)
│   ├── dashboard/            # Main dashboard
│   ├── function-model/       # Function model management
│   ├── profile/              # User profile management
│   ├── settings/             # Application settings
│   └── layout.tsx            # Private layout with navigation
├── (public)/                 # Public route group (no authentication required)
│   ├── page.tsx              # Landing/home page
│   ├── about/                # About page
│   ├── contact/              # Contact page
│   └── layout.tsx            # Public layout
├── api/                      # API routes (Framework Layer)
│   ├── contact/              # Contact form handler
│   └── auth/                 # Authentication endpoints
├── components/               # Reusable UI components (Presentation Layer)
│   ├── ui/                   # Base UI components (Button, Input, Card)
│   ├── forms/                # Form-specific components
│   ├── features/             # Feature-specific components
│   └── layout/               # Layout components (Header, Sidebar)
├── hooks/                    # UI logic hooks (Presentation Layer)
│   ├── use-form-state.ts     # Form state management
│   ├── use-ui-state.ts       # UI-specific state (modals, themes)
│   └── use-data-fetching.ts  # Data fetching patterns
├── use-cases/                # Presentation-specific use cases
│   ├── ui-workflows/         # UI-only workflows
│   │   ├── toggle-theme.ts   # Theme switching logic
│   │   ├── show-notification.ts # Notification management
│   │   └── form-validation.ts # Client-side form validation
│   └── data-access/          # Application layer bridges
│       ├── user-operations.ts # User-related use case calls
│       └── content-operations.ts # Content management calls
├── styles/                   # Styling concerns
│   ├── globals.css           # Global styles
│   └── components.css        # Component-specific styles
├── layout.tsx                # Root layout
└── globals.css               # Global styles
```

### Presentation Layer Principles

#### 1. **UI Components (Pure Presentation)**
Components should be focused on rendering and user interaction, with minimal logic.

**What Belongs Here**:
- Rendering logic and visual presentation
- User input handling (click, type, scroll)
- Local UI state (form inputs, modals, dropdowns)
- Accessibility and responsive behavior

**What Should NOT Be Here**:
- Business logic or business rules
- Direct API calls or data fetching
- Complex data transformations
- Domain entity manipulation

**Example**:
```typescript
// Good: Pure presentation component
interface UserCardProps {
  user: UserDisplayModel // DTO from use case
  onEdit: (userId: string) => void // Callback to parent
  onDelete: (userId: string) => void
}

export function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  const [isExpanded, setIsExpanded] = useState(false) // UI state only
  
  return (
    <Card>
      <CardHeader onClick={() => setIsExpanded(!isExpanded)}>
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <p>{user.bio}</p>
          <Button onClick={() => onEdit(user.id)}>Edit</Button>
          <Button onClick={() => onDelete(user.id)}>Delete</Button>
        </CardContent>
      )}
    </Card>
  )
}
```

#### 2. **UI Hooks (Presentation Logic)**
Hooks manage UI-specific state and effects, bridging components to use cases.

**What Belongs Here**:
- Form state management and validation
- UI state coordination (modals, themes, notifications)
- Component lifecycle effects
- Local storage for UI preferences

**Example**:
```typescript
// Good: UI-focused hook
export function useUserForm(initialUser?: User) {
  const [formData, setFormData] = useState(initialUser || emptyUser)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const validateForm = () => {
    // UI validation only (format, required fields)
    const newErrors: FormErrors = {}
    if (!formData.email.includes('@')) {
      newErrors.email = 'Invalid email format'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (onSubmit: (data: UserFormData) => Promise<void>) => {
    if (!validateForm()) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(formData) // Delegate to use case
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return {
    formData,
    setFormData,
    errors,
    isSubmitting,
    handleSubmit
  }
}
```

#### 3. **Presentation Use Cases (UI Workflows)**
Handle UI-specific workflows that don't involve business logic.

**What Belongs Here**:
- Theme switching and UI preferences
- Notification management
- Modal state coordination
- Form validation (format/type checking)
- Client-side routing logic

**Example**:
```typescript
// Good: UI-only use case
export class ToggleThemeUseCase {
  constructor(
    private themeStorage: ThemeStorage, // Interface for persistence
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

// Good: Form validation use case
export class FormValidationUseCase {
  validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return {
      isValid: emailRegex.test(email),
      error: emailRegex.test(email) ? null : 'Invalid email format'
    }
  }
  
  validateRequired(value: string, fieldName: string): ValidationResult {
    return {
      isValid: value.trim().length > 0,
      error: value.trim().length > 0 ? null : `${fieldName} is required`
    }
  }
}
```

#### 4. **Data Access Bridges (Application Integration)**
Connect presentation layer to application use cases through clean interfaces.

**What Belongs Here**:
- Orchestrating application layer use cases
- Data transformation between domain models and UI models
- Error handling and user feedback
- Loading state management

**Example**:
```typescript
// Good: Bridge to application layer
export class UserOperationsPresenter {
  constructor(
    private createUserUseCase: CreateUserUseCase, // Application layer
    private getUserUseCase: GetUserUseCase,
    private notificationService: NotificationService // UI service
  ) {}
  
  async createUser(formData: UserFormData): Promise<UserDisplayModel> {
    try {
      // Convert UI model to domain model
      const userData: CreateUserRequest = {
        email: formData.email,
        name: formData.name,
        // ... other mappings
      }
      
      // Call application use case
      const user = await this.createUserUseCase.execute(userData)
      
      // Show UI feedback
      this.notificationService.showSuccess('User created successfully')
      
      // Convert domain model to UI model
      return this.mapToDisplayModel(user)
    } catch (error) {
      // Handle errors with user-friendly messages
      this.notificationService.showError('Failed to create user')
      throw error
    }
  }
  
  private mapToDisplayModel(user: User): UserDisplayModel {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      displayName: `${user.name} (${user.email})`, // UI-specific formatting
      // ... other UI-specific properties
    }
  }
}
```

### Presentation Layer Communication Rules

1. **No Direct Business Logic**: Components and hooks should not contain business rules
2. **Interface-Based Integration**: Use interfaces to communicate with application layer
3. **Data Transformation**: Convert between domain models and UI-specific display models
4. **Error Boundaries**: Handle and display errors appropriately for users
5. **State Isolation**: UI state should be separate from business state
6. **Event-Driven**: Use callbacks and events for component communication

### Testing Presentation Layer

**Component Testing**:
- Test rendering with different props
- Test user interactions (clicks, form inputs)
- Mock use case dependencies
- Focus on UI behavior, not business logic

**Hook Testing**:
- Test state management and effects
- Mock external dependencies
- Test UI workflows and validation

**Integration Testing**:
- Test component and use case integration
- Test data flow through the presentation layer
- Mock application layer dependencies
