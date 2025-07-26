"use client"

import { Section } from "@/components/ui/section"
import { ServiceCard } from "@/components/composites/service-card"
import { getWorkProcess } from "@/lib/use-cases/get-services"

export function ServicesSection() {
  const workProcess = getWorkProcess()

  return (
    <Section id="how-we-work" className="bg-gray-50">
      <div className="text-center mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How We Work</h2>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Our proven four-step methodology ensures successful AI automation implementation that delivers measurable
          results and transforms your business operations.
        </p>
      </div>

      {/* Step Numbers and Single Connecting Line */}
      <div className="relative flex items-center justify-between max-w-5xl mx-auto mb-10 px-2" style={{height: 60}}>
        {/* Single horizontal line */}
        <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-gradient-to-r from-blue-200 to-purple-200 z-0" />
        {/* Step numbers */}
        {workProcess.map((_, index) => (
          <div key={index} className="flex flex-col items-center flex-1 z-10">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full text-lg font-bold">
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Step Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {workProcess.map((step, index) => (
          <div key={step.id} className="flex flex-col h-full items-stretch">
            <div className="flex-1 flex flex-col">
              <ServiceCard service={step} />
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
