import type { SOP, CreateSOPRequest, UpdateSOPRequest, ValidationResult } from "../entities/knowledge-base-types"

// Business rules and validation logic
export const SOP_VALIDATION_RULES = {
  title: { minLength: 3, maxLength: 200 },
  content: { minLength: 10 },
  tags: { maxCount: 10, maxLength: 50 },
  category: { required: true },
  summary: { maxLength: 500 }
}

export function validateSOP(sop: Partial<SOP>): ValidationResult {
  const errors: string[] = []

  // Title validation
  if (sop.title) {
    if (sop.title.length < SOP_VALIDATION_RULES.title.minLength) {
      errors.push(`Title must be at least ${SOP_VALIDATION_RULES.title.minLength} characters`)
    }
    if (sop.title.length > SOP_VALIDATION_RULES.title.maxLength) {
      errors.push(`Title must be no more than ${SOP_VALIDATION_RULES.title.maxLength} characters`)
    }
  }

  // Content validation
  if (sop.content) {
    if (sop.content.length < SOP_VALIDATION_RULES.content.minLength) {
      errors.push(`Content must be at least ${SOP_VALIDATION_RULES.content.minLength} characters`)
    }
  }

  // Tags validation
  if (sop.tags) {
    if (sop.tags.length > SOP_VALIDATION_RULES.tags.maxCount) {
      errors.push(`Maximum ${SOP_VALIDATION_RULES.tags.maxCount} tags allowed`)
    }
    
    for (const tag of sop.tags) {
      if (tag.length > SOP_VALIDATION_RULES.tags.maxLength) {
        errors.push(`Tag "${tag}" must be no more than ${SOP_VALIDATION_RULES.tags.maxLength} characters`)
      }
    }
  }

  // Category validation
  if (SOP_VALIDATION_RULES.category.required && !sop.category) {
    errors.push("Category is required")
  }

  // Summary validation
  if (sop.summary && sop.summary.length > SOP_VALIDATION_RULES.summary.maxLength) {
    errors.push(`Summary must be no more than ${SOP_VALIDATION_RULES.summary.maxLength} characters`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateCreateSOPRequest(request: CreateSOPRequest): ValidationResult {
  const errors: string[] = []

  // Required fields
  if (!request.title) errors.push("Title is required")
  if (!request.content) errors.push("Content is required")
  if (!request.summary) errors.push("Summary is required")
  if (!request.category) errors.push("Category is required")
  if (!request.author) errors.push("Author is required")

  // Validate SOP object
  const sopValidation = validateSOP(request)
  errors.push(...sopValidation.errors)

  return {
    isValid: errors.length === 0,
    errors
  }
}

export function validateUpdateSOPRequest(request: UpdateSOPRequest): ValidationResult {
  return validateSOP(request)
} 