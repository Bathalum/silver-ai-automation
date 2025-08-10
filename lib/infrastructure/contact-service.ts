// Contact form submission service following Clean Architecture infrastructure layer patterns

export interface ContactSubmissionResult {
  success: boolean
  message: string
  submissionId?: string
  error?: string
}

export interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

/**
 * Infrastructure service for handling contact form submissions
 * Following Clean Architecture principles - handles external system interactions
 */
export class ContactService {
  private static readonly API_ENDPOINT = process.env.NEXT_PUBLIC_CONTACT_API_ENDPOINT || '/api/contact'
  private static readonly TIMEOUT_MS = 10000

  /**
   * Submits contact form to external service or API
   */
  static async submit(data: ContactFormData): Promise<ContactSubmissionResult> {
    try {
      // Sanitize data before submission
      const sanitizedData = this.sanitizeData(data)

      // Create submission payload
      const payload = {
        ...sanitizedData,
        timestamp: new Date().toISOString(),
        source: 'website_contact_form'
      }

      // Make API call with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS)

      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      return {
        success: true,
        message: 'Thank you for your message! We\'ll get back to you soon.',
        submissionId: result.id || result.submissionId
      }

    } catch (error) {
      console.error('Contact form submission error:', error)

      // Handle different error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            message: 'Request timed out. Please try again.',
            error: 'TIMEOUT'
          }
        }

        if (error.message.includes('fetch')) {
          return {
            success: false,
            message: 'Network error. Please check your connection and try again.',
            error: 'NETWORK_ERROR'
          }
        }
      }

      return {
        success: false,
        message: 'Sorry, there was an error sending your message. Please try again or contact us directly.',
        error: 'SUBMISSION_FAILED'
      }
    }
  }

  /**
   * Sanitizes form data to prevent XSS and other security issues
   */
  private static sanitizeData(data: ContactFormData): ContactFormData {
    return {
      name: this.sanitizeString(data.name),
      email: this.sanitizeEmail(data.email),
      subject: this.sanitizeString(data.subject),
      message: this.sanitizeString(data.message)
    }
  }

  /**
   * Sanitizes a general string field
   */
  private static sanitizeString(value: string): string {
    if (!value) return ''
    
    return value
      .trim()
      // Remove potential HTML/script tags
      .replace(/<[^>]*>/g, '')
      // Remove potential script injections
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
  }

  /**
   * Sanitizes email field with additional email-specific validation
   */
  private static sanitizeEmail(email: string): string {
    if (!email) return ''
    
    return email
      .trim()
      .toLowerCase()
      // Remove any non-email characters
      .replace(/[^a-z0-9@._-]/g, '')
  }

  /**
   * Validates that the service is properly configured
   */
  static validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.API_ENDPOINT || this.API_ENDPOINT === '/api/contact') {
      errors.push('Contact API endpoint not configured')
    }

    try {
      new URL(this.API_ENDPOINT.startsWith('/') ? `https://example.com${this.API_ENDPOINT}` : this.API_ENDPOINT)
    } catch {
      errors.push('Invalid contact API endpoint URL')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

/**
 * Main submission function used by the presentation layer
 */
export async function submitContactForm(data: ContactFormData): Promise<ContactSubmissionResult> {
  return ContactService.submit(data)
}

/**
 * Configuration validation function
 */
export function validateContactServiceConfiguration(): { isValid: boolean; errors: string[] } {
  return ContactService.validateConfiguration()
}
