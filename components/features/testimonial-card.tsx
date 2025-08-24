import type React from "react"
import { Card, CardContent } from "@/components/ui/card"

export interface TestimonialData {
  id: string
  name: string
  role: string
  company: string
  content: string
  rating?: number
  image?: string
  verified?: boolean
}

interface TestimonialCardProps {
  testimonial: TestimonialData
  className?: string
}

/**
 * TestimonialCard - Composite component that displays customer testimonial information
 * 
 * This component follows the composite component pattern, combining multiple base components
 * (Card, CardContent) to create a reusable testimonial display unit.
 */
export function TestimonialCard({ testimonial, className = "" }: TestimonialCardProps) {
  return (
    <Card className={`h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${className}`}>
      <CardContent className="p-6">
        {/* Rating stars */}
        {testimonial.rating && (
          <div className="flex items-center mb-4">
            {[...Array(5)].map((_, index) => (
              <svg
                key={index}
                className={`w-4 h-4 ${
                  index < testimonial.rating! ? 'text-yellow-400' : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            {testimonial.verified && (
              <span className="ml-2 text-xs text-green-600 font-medium">Verified</span>
            )}
          </div>
        )}

        {/* Testimonial content */}
        <blockquote className="text-gray-700 mb-6 leading-relaxed">
          &ldquo;{testimonial.content}&rdquo;
        </blockquote>

        {/* Author info */}
        <div className="flex items-center gap-3">
          {testimonial.image ? (
            <img
              src={testimonial.image}
              alt={testimonial.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {testimonial.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold text-gray-900">{testimonial.name}</div>
            <div className="text-sm text-gray-600">
              {testimonial.role} at {testimonial.company}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * TestimonialGrid - Composite component for displaying multiple testimonials in a grid
 */
interface TestimonialGridProps {
  testimonials: TestimonialData[]
  className?: string
  columns?: 2 | 3
}

export function TestimonialGrid({ 
  testimonials, 
  className = "",
  columns = 3 
}: TestimonialGridProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-6 ${className}`}>
      {testimonials.map((testimonial) => (
        <TestimonialCard key={testimonial.id} testimonial={testimonial} />
      ))}
    </div>
  )
}

/**
 * FeaturedTestimonial - Special layout for highlighting a key testimonial
 */
interface FeaturedTestimonialProps {
  testimonial: TestimonialData
  className?: string
}

export function FeaturedTestimonial({ testimonial, className = "" }: FeaturedTestimonialProps) {
  return (
    <Card className={`bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-xl ${className}`}>
      <CardContent className="p-8 text-center">
        {/* Rating */}
        {testimonial.rating && (
          <div className="flex items-center justify-center mb-6">
            {[...Array(5)].map((_, index) => (
              <svg
                key={index}
                className={`w-5 h-5 ${
                  index < testimonial.rating! ? 'text-yellow-400' : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        )}

        {/* Content */}
        <blockquote className="text-xl text-gray-700 mb-8 leading-relaxed">
          &ldquo;{testimonial.content}&rdquo;
        </blockquote>

        {/* Author */}
        <div className="flex items-center justify-center gap-4">
          {testimonial.image ? (
            <img
              src={testimonial.image}
              alt={testimonial.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
              {testimonial.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
          )}
          <div className="text-left">
            <div className="font-semibold text-gray-900 text-lg">{testimonial.name}</div>
            <div className="text-gray-600">
              {testimonial.role} at {testimonial.company}
            </div>
            {testimonial.verified && (
              <div className="text-sm text-green-600 font-medium mt-1">✓ Verified Customer</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
