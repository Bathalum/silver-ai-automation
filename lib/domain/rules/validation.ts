/**
 * Domain validation rules for contact forms and other business logic
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

/**
 * Validates contact form data according to business rules
 */
export function validateContactForm(data: ContactFormData): ValidationResult {
  const errors: string[] = []

  // Validate name
  if (!data.name.trim()) {
    errors.push('Name is required')
  } else if (data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters')
  } else if (data.name.trim().length > 100) {
    errors.push('Name must be no more than 100 characters')
  }

  // Validate email
  if (!data.email.trim()) {
    errors.push('Email is required')
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email.trim())) {
      errors.push('Invalid email format')
    }
  }

  // Validate subject
  if (!data.subject.trim()) {
    errors.push('Subject is required')
  } else if (data.subject.trim().length < 5) {
    errors.push('Subject must be at least 5 characters')
  } else if (data.subject.trim().length > 200) {
    errors.push('Subject must be no more than 200 characters')
  }

  // Validate message
  if (!data.message.trim()) {
    errors.push('Message is required')
  } else if (data.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters')
  } else if (data.message.trim().length > 2000) {
    errors.push('Message must be no more than 2000 characters')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isValid = emailRegex.test(email.trim())
  
  return {
    isValid,
    errors: isValid ? [] : ['Invalid email format']
  }
}

/**
 * Validates required field
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  const isValid = value.trim().length > 0
  
  return {
    isValid,
    errors: isValid ? [] : [`${fieldName} is required`]
  }
}

/**
 * Validates minimum length
 */
export function validateMinLength(value: string, minLength: number, fieldName: string): ValidationResult {
  const isValid = value.trim().length >= minLength
  
  return {
    isValid,
    errors: isValid ? [] : [`${fieldName} must be at least ${minLength} characters`]
  }
}

/**
 * Validates maximum length
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): ValidationResult {
  const isValid = value.trim().length <= maxLength
  
  return {
    isValid,
    errors: isValid ? [] : [`${fieldName} must be no more than ${maxLength} characters`]
  }
}
