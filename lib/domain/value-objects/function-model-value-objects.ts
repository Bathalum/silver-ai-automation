// Function Model Value Objects
// This file contains value objects for function model domain concepts

import { DomainError } from '../exceptions/domain-exceptions'

// Common Value Objects
export class VersionNumber {
  constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number
  ) {
    if (major < 0 || minor < 0 || patch < 0) {
      throw new DomainError('Version numbers must be non-negative')
    }
  }

  static fromString(version: string): VersionNumber {
    const parts = version.split('.')
    if (parts.length !== 3) {
      throw new DomainError('Version must be in format X.Y.Z')
    }
    
    const [major, minor, patch] = parts.map(Number)
    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
      throw new DomainError('Version parts must be valid numbers')
    }
    
    return new VersionNumber(major, minor, patch)
  }

  incrementPatch(): VersionNumber {
    return new VersionNumber(this.major, this.minor, this.patch + 1)
  }

  incrementMinor(): VersionNumber {
    return new VersionNumber(this.major, this.minor + 1, 0)
  }

  incrementMajor(): VersionNumber {
    return new VersionNumber(this.major + 1, 0, 0)
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`
  }

  equals(other: VersionNumber): boolean {
    return this.major === other.major && 
           this.minor === other.minor && 
           this.patch === other.patch
  }

  isGreaterThan(other: VersionNumber): boolean {
    if (this.major !== other.major) return this.major > other.major
    if (this.minor !== other.minor) return this.minor > other.minor
    return this.patch > other.patch
  }
}

export class Position {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (x < 0 || y < 0) {
      throw new DomainError('Position coordinates must be non-negative')
    }
  }

  distanceTo(other: Position): number {
    const dx = this.x - other.x
    const dy = this.y - other.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  move(dx: number, dy: number): Position {
    return new Position(this.x + dx, this.y + dy)
  }

  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y
  }
}

export class LinkStrength {
  constructor(public readonly value: number) {
    if (value < 0 || value > 1) {
      throw new DomainError('Link strength must be between 0 and 1')
    }
  }

  static fromPercentage(percentage: number): LinkStrength {
    if (percentage < 0 || percentage > 100) {
      throw new DomainError('Percentage must be between 0 and 100')
    }
    return new LinkStrength(percentage / 100)
  }

  toPercentage(): number {
    return this.value * 100
  }

  isStrong(): boolean {
    return this.value >= 0.7
  }

  isWeak(): boolean {
    return this.value <= 0.3
  }
}

export class Email {
  constructor(public readonly value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      throw new DomainError('Invalid email format')
    }
  }

  getDomain(): string {
    return this.value.split('@')[1]
  }

  getUsername(): string {
    return this.value.split('@')[0]
  }
}

export class PhoneNumber {
  constructor(public readonly value: string) {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/
    if (!phoneRegex.test(value) || value.length < 10) {
      throw new DomainError('Invalid phone number format')
    }
  }

  getCountryCode(): string | null {
    if (this.value.startsWith('+')) {
      const match = this.value.match(/^\+(\d{1,3})/)
      return match ? match[1] : null
    }
    return null
  }
}

// Domain-Specific Value Objects
export class ExecutionType {
  static readonly SEQUENTIAL = 'sequential'
  static readonly PARALLEL = 'parallel'
  static readonly CONDITIONAL = 'conditional'

  constructor(public readonly value: string) {
    const validTypes = [ExecutionType.SEQUENTIAL, ExecutionType.PARALLEL, ExecutionType.CONDITIONAL]
    if (!validTypes.includes(value)) {
      throw new DomainError(`Invalid execution type: ${value}`)
    }
  }

  isSequential(): boolean {
    return this.value === ExecutionType.SEQUENTIAL
  }

  isParallel(): boolean {
    return this.value === ExecutionType.PARALLEL
  }

  isConditional(): boolean {
    return this.value === ExecutionType.CONDITIONAL
  }
}

export class RetryPolicy {
  constructor(
    public readonly maxRetries: number,
    public readonly backoff: 'linear' | 'exponential' | 'constant',
    public readonly initialDelay: number,
    public readonly maxDelay: number
  ) {
    if (maxRetries < 0 || maxRetries > 10) {
      throw new DomainError('Max retries must be between 0 and 10')
    }
    if (initialDelay < 0 || maxDelay < 0) {
      throw new DomainError('Delays must be non-negative')
    }
    if (initialDelay > maxDelay) {
      throw new DomainError('Initial delay cannot exceed max delay')
    }
  }

  calculateDelay(attempt: number): number {
    if (attempt <= 0) return this.initialDelay
    
    switch (this.backoff) {
      case 'linear':
        return Math.min(this.initialDelay * attempt, this.maxDelay)
      case 'exponential':
        return Math.min(this.initialDelay * Math.pow(2, attempt - 1), this.maxDelay)
      case 'constant':
        return this.initialDelay
      default:
        return this.initialDelay
    }
  }
}

export class RACIMatrix {
  constructor(
    public readonly responsible: string[],
    public readonly accountable: string[],
    public readonly consulted: string[],
    public readonly informed: string[]
  ) {
    if (responsible.length === 0) {
      throw new DomainError('At least one person must be responsible')
    }
    if (accountable.length === 0) {
      throw new DomainError('At least one person must be accountable')
    }
    if (responsible.length > 10 || accountable.length > 10 || 
        consulted.length > 20 || informed.length > 20) {
      throw new DomainError('Too many people assigned to roles')
    }
  }

  hasRole(userId: string): boolean {
    return this.responsible.includes(userId) ||
           this.accountable.includes(userId) ||
           this.consulted.includes(userId) ||
           this.informed.includes(userId)
  }

  getRole(userId: string): string[] {
    const roles: string[] = []
    if (this.responsible.includes(userId)) roles.push('responsible')
    if (this.accountable.includes(userId)) roles.push('accountable')
    if (this.consulted.includes(userId)) roles.push('consulted')
    if (this.informed.includes(userId)) roles.push('informed')
    return roles
  }

  addResponsible(userId: string): RACIMatrix {
    return new RACIMatrix(
      [...this.responsible, userId],
      this.accountable,
      this.consulted,
      this.informed
    )
  }

  removeResponsible(userId: string): RACIMatrix {
    return new RACIMatrix(
      this.responsible.filter(id => id !== userId),
      this.accountable,
      this.consulted,
      this.informed
    )
  }
}

export class ServiceLevelAgreement {
  constructor(
    public readonly responseTime: number,
    public readonly availability: number,
    public readonly uptime: number
  ) {
    if (responseTime < 0) {
      throw new DomainError('Response time must be non-negative')
    }
    if (availability < 0 || availability > 100) {
      throw new DomainError('Availability must be between 0 and 100')
    }
    if (uptime < 0 || uptime > 100) {
      throw new DomainError('Uptime must be between 0 and 100')
    }
  }

  isMet(responseTime: number, availability: number, uptime: number): boolean {
    return responseTime <= this.responseTime &&
           availability >= this.availability &&
           uptime >= this.uptime
  }

  getBreachLevel(responseTime: number, availability: number, uptime: number): 'none' | 'minor' | 'major' | 'critical' {
    const responseTimeBreach = responseTime > this.responseTime * 1.5
    const availabilityBreach = availability < this.availability * 0.9
    const uptimeBreach = uptime < this.uptime * 0.9

    if (responseTimeBreach && availabilityBreach && uptimeBreach) return 'critical'
    if (availabilityBreach || uptimeBreach) return 'major'
    if (responseTimeBreach) return 'minor'
    return 'none'
  }
}

// Validation Rules
export class ValidationRules {
  static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainError('Name is required')
    }
    if (name.length > 255) {
      throw new DomainError('Name cannot exceed 255 characters')
    }
  }

  static validateDescription(description?: string): void {
    if (description && description.length > 1000) {
      throw new DomainError('Description cannot exceed 1000 characters')
    }
  }

  static validateArrayLength<T>(array: T[], maxLength: number, fieldName: string): void {
    if (array.length > maxLength) {
      throw new DomainError(`${fieldName} cannot exceed ${maxLength} items`)
    }
  }

  static validateTimeout(timeout: number): void {
    if (timeout < 0) {
      throw new DomainError('Timeout must be non-negative')
    }
    if (timeout > 3600000) { // 1 hour in milliseconds
      throw new DomainError('Timeout cannot exceed 1 hour')
    }
  }
} 