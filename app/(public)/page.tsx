import { Navigation } from "@/components/features/navigation"
import { HeroSection } from "@/components/features/hero-section"
import { ServicesSection } from "@/components/features/services-section"
import { TestimonialsSection } from "@/components/features/testimonials-section"
import { ContactSection } from "@/components/features/contact-section"
import { Footer } from "@/components/features/footer"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <HeroSection />
      <ServicesSection />
      <TestimonialsSection />
      <ContactSection />
      <Footer />
    </main>
  )
}
