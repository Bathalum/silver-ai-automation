import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Quote } from "lucide-react"
import type { Testimonial } from "@/lib/domain/entities/service"

interface TestimonialCardProps {
  testimonial: Testimonial
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <Card className="h-full hover:shadow-xl hover:shadow-gray-500/10 transition-all duration-500 hover:-translate-y-1 group border-0 shadow-md bg-white/90 backdrop-blur-sm hover:bg-white">
      <CardContent className="p-6 relative">
        <Quote className="absolute top-4 right-4 h-8 w-8 text-blue-100 group-hover:text-blue-200 transition-colors duration-300" />

        <blockquote className="text-gray-700 mb-6 italic leading-relaxed group-hover:text-gray-900 transition-colors duration-300">
          &ldquo;{testimonial.content}&rdquo;
        </blockquote>

        <div className="flex items-center gap-3">
          <Avatar className="ring-2 ring-blue-100 group-hover:ring-blue-200 transition-all duration-300 group-hover:scale-110">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {testimonial.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
              {testimonial.name}
            </div>
            <div className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
              {testimonial.role} at {testimonial.company}
            </div>
          </div>
        </div>

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
      </CardContent>
    </Card>
  )
}
