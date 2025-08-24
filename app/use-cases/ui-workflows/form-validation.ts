/**
 * UI-only use case for client-side form validation
 * This handles format validation and user input checking
 */

export interface ValidationResult {
  isValid: boolean
  error: string | null
}

export class FormValidationUseCase {
  validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return {
      isValid: emailRegex.test(email),
      error: emailRegex.test(email) ? null : 'Invalid email format'
    }
  }

  validateRequired(value: string, fieldName: string): ValidationResult {
    const isValid = value.trim().length > 0
    return {
      isValid,
      error: isValid ? null : `${fieldName} is required`
    }
  }

  validateMinLength(value: string, minLength: number, fieldName: string): ValidationResult {
    const isValid = value.length >= minLength
    return {
      isValid,
      error: isValid ? null : `${fieldName} must be at least ${minLength} characters`
    }
  }

  validateMaxLength(value: string, maxLength: number, fieldName: string): ValidationResult {
    const isValid = value.length <= maxLength
    return {
      isValid,
      error: isValid ? null : `${fieldName} must be no more than ${maxLength} characters`
    }
  }

  validatePassword(password: string): ValidationResult {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    if (password.length < minLength) {
      return {
        isValid: false,
        error: `Password must be at least ${minLength} characters`
      }
    }

    if (!hasUpperCase) {
      return {
        isValid: false,
        error: 'Password must contain at least one uppercase letter'
      }
    }

    if (!hasLowerCase) {
      return {
        isValid: false,
        error: 'Password must contain at least one lowercase letter'
      }
    }

    if (!hasNumbers) {
      return {
        isValid: false,
        error: 'Password must contain at least one number'
      }
    }

    if (!hasSpecialChar) {
      return {
        isValid: false,
        error: 'Password must contain at least one special character'
      }
    }

    return {
      isValid: true,
      error: null
    }
  }

  validateUrl(url: string): ValidationResult {
    try {
      new URL(url)
      return {
        isValid: true,
        error: null
      }
    } catch {
      return {
        isValid: false,
        error: 'Invalid URL format'
      }
    }
  }

  validatePhone(phone: string): ValidationResult {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/
    return {
      isValid: phoneRegex.test(phone),
      error: phoneRegex.test(phone) ? null : 'Invalid phone number format'
    }
  }
}
