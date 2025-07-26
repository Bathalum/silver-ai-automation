export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validateContactForm = (data: {
  name: string
  email: string
  message: string
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!data.name.trim()) errors.push("Name is required")
  if (!data.email.trim()) errors.push("Email is required")
  else if (!validateEmail(data.email)) errors.push("Invalid email format")
  if (!data.message.trim()) errors.push("Message is required")

  return { isValid: errors.length === 0, errors }
}
