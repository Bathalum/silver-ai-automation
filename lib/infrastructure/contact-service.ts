export interface ContactFormData {
  name: string
  email: string
  message: string
}

export const submitContactForm = async (data: ContactFormData): Promise<{ success: boolean; message: string }> => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // In a real implementation, this would call your backend API
  console.log("Contact form submitted:", data)

  return {
    success: true,
    message: "Thank you for your message. We'll get back to you within 24 hours.",
  }
}
