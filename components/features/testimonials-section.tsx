"use client"

import { Section } from "@/components/ui/section"
import { TestimonialCard } from "@/components/composites/testimonial-card"
import { getTestimonials } from "@/lib/use-cases/get-testimonials"

export function TestimonialsSection() {
  const testimonials = getTestimonials()

  return (
    <Section id="testimonials">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">What Our Clients Say</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Don't just take our word for it. See how we've helped businesses transform their operations and achieve
          remarkable results.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {testimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </div>
    </Section>
  )
}
