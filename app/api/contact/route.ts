import { NextRequest, NextResponse } from 'next/server'
import { validateContactForm } from '@/lib/domain/rules/validation'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { name, email, subject, message } = body

    // Validate the form data using domain validation rules
    const validation = validateContactForm({ name, email, subject, message })
    
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed',
          errors: validation.errors 
        },
        { status: 400 }
      )
    }

    // Log the contact form submission (in a real app, you'd save to database or send email)
    console.log('Contact form submission:', {
      name: name?.trim(),
      email: email?.trim(),
      subject: subject?.trim(),
      message: message?.trim(),
      timestamp: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500))

    // In a real application, you would:
    // 1. Save to database
    // 2. Send email notification
    // 3. Integrate with CRM
    // 4. Send auto-reply to user

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message! We\'ll get back to you soon.',
      submissionId: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })

  } catch (error) {
    console.error('Contact form API error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error. Please try again later.',
        error: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  )
}
