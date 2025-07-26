import type { Testimonial } from "../domain/entities/service"

export const getTestimonials = (): Testimonial[] => {
  return [
    {
      id: "1",
      name: "Sarah Johnson",
      role: "Operations Director",
      company: "TechCorp Solutions",
      content:
        "Silver AI Automation transformed our workflow efficiency by 300%. The ROI was evident within the first quarter.",
    },
    {
      id: "2",
      name: "Michael Chen",
      role: "CEO",
      company: "DataFlow Industries",
      content:
        "Their AI solutions helped us process customer inquiries 10x faster while maintaining exceptional quality.",
    },
    {
      id: "3",
      name: "Emily Rodriguez",
      role: "CTO",
      company: "InnovateLab",
      content:
        "The custom automation solutions delivered exactly what we needed. Professional team with outstanding results.",
    },
  ]
}
