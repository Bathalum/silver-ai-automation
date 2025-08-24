// Use case for getting testimonial data
// Following Clean Architecture application layer patterns

import type { TestimonialData } from "@/components/features/testimonial-card"

/**
 * Get customer testimonials - Application layer use case
 * 
 * This function provides the business logic for retrieving testimonial data.
 * In a full implementation, this might fetch from a database or external API,
 * but for now it returns static data that matches the business requirements.
 */
export function getTestimonials(): TestimonialData[] {
  return [
    {
      id: "testimonial-1",
      name: "Sarah Johnson",
      role: "Operations Director", 
      company: "TechFlow Solutions",
      content: "Silver AI Automation transformed our entire workflow. What used to take our team 8 hours now completes in under 30 minutes. The ROI was evident within the first month, and our team can now focus on strategic initiatives rather than repetitive tasks.",
      rating: 5,
      verified: true
    },
    {
      id: "testimonial-2", 
      name: "Michael Chen",
      role: "CEO",
      company: "DataDrive Analytics",
      content: "The AI automation solutions provided by Silver AI have been game-changing for our business. Their team understood our complex requirements and delivered a system that exceeded our expectations. Customer satisfaction has increased by 40% since implementation.",
      rating: 5,
      verified: true
    },
    {
      id: "testimonial-3",
      name: "Emily Rodriguez",
      role: "VP of Operations",
      company: "Growth Dynamics",
      content: "Working with Silver AI was one of the best decisions we made this year. Their expertise in AI automation helped us reduce operational costs by 35% while improving accuracy. The support team is exceptional and always available when we need them.",
      rating: 5,
      verified: true
    },
    {
      id: "testimonial-4",
      name: "David Thompson", 
      role: "CTO",
      company: "Innovation Labs",
      content: "Silver AI's approach to automation is methodical and results-driven. They didn't just implement technology; they redesigned our processes for maximum efficiency. Our development cycle is now 50% faster, and code quality has significantly improved.",
      rating: 5,
      verified: true
    },
    {
      id: "testimonial-5",
      name: "Lisa Park",
      role: "Finance Director", 
      company: "FinanceFirst Corp",
      content: "The financial impact of Silver AI's automation solutions has been remarkable. We've seen a 60% reduction in processing time for financial reports and a 95% decrease in manual errors. The system pays for itself every quarter.",
      rating: 5,
      verified: true
    },
    {
      id: "testimonial-6",
      name: "Robert Wilson",
      role: "Head of Customer Success",
      company: "ServicePro Inc",
      content: "Our customer response time improved from hours to minutes after implementing Silver AI's customer service automation. The AI understands context better than we expected, and our customer satisfaction scores have reached all-time highs.",
      rating: 5,
      verified: true
    }
  ]
}

/**
 * Get featured testimonials - subset of most impactful testimonials
 */
export function getFeaturedTestimonials(): TestimonialData[] {
  const testimonials = getTestimonials()
  // Return first 3 testimonials as featured
  return testimonials.slice(0, 3)
}

/**
 * Get testimonials by company size
 */
export function getTestimonialsByCompanySize(size: 'startup' | 'midsize' | 'enterprise'): TestimonialData[] {
  const testimonials = getTestimonials()
  
  // In a real implementation, this would filter based on actual company data
  // For now, we'll just return different sets based on the request
  switch (size) {
    case 'startup':
      return testimonials.slice(0, 2)
    case 'midsize': 
      return testimonials.slice(2, 4)
    case 'enterprise':
      return testimonials.slice(4, 6)
    default:
      return testimonials
  }
}

/**
 * Get testimonials by industry
 */
export function getTestimonialsByIndustry(industry: string): TestimonialData[] {
  const testimonials = getTestimonials()
  
  // In a real implementation, this would filter based on actual industry data
  // For now, return all testimonials since they represent various industries
  return testimonials
}

/**
 * Get specific testimonial by ID
 */
export function getTestimonialById(id: string): TestimonialData | undefined {
  const testimonials = getTestimonials()
  return testimonials.find(testimonial => testimonial.id === id)
}

/**
 * Get testimonials statistics
 */
export function getTestimonialStats(): {
  totalTestimonials: number
  averageRating: number
  verifiedPercentage: number
  totalCompanies: number
} {
  const testimonials = getTestimonials()
  
  const totalTestimonials = testimonials.length
  const averageRating = testimonials.reduce((sum, t) => sum + (t.rating || 0), 0) / totalTestimonials
  const verifiedCount = testimonials.filter(t => t.verified).length
  const verifiedPercentage = (verifiedCount / totalTestimonials) * 100
  const totalCompanies = new Set(testimonials.map(t => t.company)).size
  
  return {
    totalTestimonials,
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    verifiedPercentage: Math.round(verifiedPercentage),
    totalCompanies
  }
}
