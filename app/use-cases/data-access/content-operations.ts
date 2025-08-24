/**
 * Data access bridge for content-related operations
 * This connects presentation layer to application use cases
 */

// Application layer interfaces (would be imported from lib/use-cases when implemented)
interface GetServicesUseCase {
  execute(): Promise<Service[]>
}

interface GetTestimonialsUseCase {
  execute(): Promise<Testimonial[]>
}

interface ContactUseCase {
  execute(contactData: ContactRequest): Promise<void>
}

// Domain models (would be imported from lib/domain/entities)
interface Service {
  id: string
  title: string
  description: string
  icon: string
  features: string[]
}

interface Testimonial {
  id: string
  name: string
  role: string
  company: string
  content: string
  rating: number
  avatar?: string
}

interface ContactRequest {
  name: string
  email: string
  subject: string
  message: string
}

// UI-specific display models
export interface ServiceDisplayModel {
  id: string
  title: string
  description: string
  icon: string
  features: string[]
  shortDescription: string
}

export interface TestimonialDisplayModel {
  id: string
  name: string
  role: string
  company: string
  content: string
  rating: number
  avatar?: string
  displayName: string
  shortContent: string
}

// UI form models
export interface ContactFormData {
  name: string
  email: string
  subject: string
  message: string
}

// UI services
export interface NotificationService {
  showSuccess(message: string): void
  showError(message: string): void
  showInfo(message: string): void
}

export class ContentOperationsPresenter {
  constructor(
    private getServicesUseCase: GetServicesUseCase,
    private getTestimonialsUseCase: GetTestimonialsUseCase,
    private contactUseCase: ContactUseCase,
    private notificationService: NotificationService
  ) {}

  async getServices(): Promise<ServiceDisplayModel[]> {
    try {
      const services = await this.getServicesUseCase.execute()
      return services.map(service => this.mapServiceToDisplayModel(service))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load services'
      this.notificationService.showError(message)
      throw error
    }
  }

  async getTestimonials(): Promise<TestimonialDisplayModel[]> {
    try {
      const testimonials = await this.getTestimonialsUseCase.execute()
      return testimonials.map(testimonial => this.mapTestimonialToDisplayModel(testimonial))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load testimonials'
      this.notificationService.showError(message)
      throw error
    }
  }

  async submitContact(formData: ContactFormData): Promise<void> {
    try {
      this.notificationService.showInfo('Sending message...')

      // Convert UI model to domain model
      const contactData: ContactRequest = {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message
      }

      // Call application use case
      await this.contactUseCase.execute(contactData)

      // Show UI feedback
      this.notificationService.showSuccess('Message sent successfully! We\'ll get back to you soon.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message'
      this.notificationService.showError(message)
      throw error
    }
  }

  private mapServiceToDisplayModel(service: Service): ServiceDisplayModel {
    return {
      id: service.id,
      title: service.title,
      description: service.description,
      icon: service.icon,
      features: service.features,
      shortDescription: service.description.length > 100 
        ? service.description.substring(0, 100) + '...'
        : service.description
    }
  }

  private mapTestimonialToDisplayModel(testimonial: Testimonial): TestimonialDisplayModel {
    return {
      id: testimonial.id,
      name: testimonial.name,
      role: testimonial.role,
      company: testimonial.company,
      content: testimonial.content,
      rating: testimonial.rating,
      avatar: testimonial.avatar,
      displayName: `${testimonial.name}, ${testimonial.role} at ${testimonial.company}`,
      shortContent: testimonial.content.length > 150
        ? testimonial.content.substring(0, 150) + '...'
        : testimonial.content
    }
  }
}
