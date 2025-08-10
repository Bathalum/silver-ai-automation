/**
 * UI hook for form state management
 * Handles form data, validation, and submission states
 */

import { useState, useCallback } from 'react'

export interface FormErrors {
  [key: string]: string | undefined
}

export interface UseFormStateOptions<T> {
  initialValues: T
  validate?: (values: T) => FormErrors
  onSubmit: (values: T) => Promise<void>
}

export interface UseFormStateReturn<T> {
  values: T
  errors: FormErrors
  isSubmitting: boolean
  isValid: boolean
  setValue: (field: keyof T, value: any) => void
  setValues: (values: Partial<T>) => void
  setError: (field: keyof T, error: string | undefined) => void
  setErrors: (errors: FormErrors) => void
  clearErrors: () => void
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  reset: () => void
}

export function useFormState<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit
}: UseFormStateOptions<T>): UseFormStateReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: undefined }))
    }
  }, [errors])

  const setFormValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }))
  }, [])

  const setError = useCallback((field: keyof T, error: string | undefined) => {
    setErrors(prev => ({ ...prev, [field as string]: error }))
  }, [])

  const setFormErrors = useCallback((newErrors: FormErrors) => {
    setErrors(newErrors)
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const validateForm = useCallback((): boolean => {
    if (!validate) return true

    const validationErrors = validate(values)
    setErrors(validationErrors)
    
    return Object.keys(validationErrors).length === 0
  }, [values, validate])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(values)
      // Don't reset form automatically - let parent component decide
    } catch (error) {
      // Error handling is done by the onSubmit function
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [values, validateForm, onSubmit])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setIsSubmitting(false)
  }, [initialValues])

  const isValid = Object.keys(errors).every(key => !errors[key])

  return {
    values,
    errors,
    isSubmitting,
    isValid,
    setValue,
    setValues: setFormValues,
    setError,
    setErrors: setFormErrors,
    clearErrors,
    handleSubmit,
    reset
  }
}
