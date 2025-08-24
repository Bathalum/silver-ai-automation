import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface ServiceData {
  id: string
  title: string
  description: string
  icon?: React.ReactNode
  step?: number
  features?: string[]
  color?: string
}

/**
 * Icon mapping for services - maps service IDs to appropriate icons
 */
function getServiceIcon(serviceId: string, color: string = '#3B82F6'): React.ReactNode {
  const iconStyle = { color }
  
  switch (serviceId) {
    case 'discovery':
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" style={iconStyle}>
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      )
    case 'strategy':
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" style={iconStyle}>
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
        </svg>
      )
    case 'implementation':
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" style={iconStyle}>
          <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      )
    case 'optimization':
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" style={iconStyle}>
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      )
    case 'ai-automation':
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" style={iconStyle}>
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      )
    case 'data-analytics':
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" style={iconStyle}>
          <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    case 'customer-service':
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" style={iconStyle}>
          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
        </svg>
      )
    case 'integration':
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" style={iconStyle}>
          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
        </svg>
      )
    default:
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" style={iconStyle}>
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414-1.414L9 5.586 7.707 4.293a1 1 0 00-1.414 1.414L8.586 8l-2.293 2.293a1 1 0 101.414 1.414L9 10.414l1.293 1.293a1 1 0 001.414-1.414L10.414 9l2.293-2.293a1 1 0 000-1.414z" clipRule="evenodd" />
        </svg>
      )
  }
}

interface ServiceCardProps {
  service: ServiceData
  className?: string
}

/**
 * ServiceCard - Composite component that displays service/process step information
 * 
 * This component follows the composite component pattern, combining multiple base components
 * (Card, CardHeader, CardTitle, CardContent) to create a reusable service display unit.
 */
export function ServiceCard({ service, className = "" }: ServiceCardProps) {
  // Use provided icon or generate one based on service ID
  const icon = service.icon || getServiceIcon(service.id, 'white')
  
  return (
    <Card className={`h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${className}`}>
      <CardHeader>
        <div className="mb-4 flex items-center justify-center">
          <div 
            className="inline-flex items-center justify-center w-16 h-16 rounded-lg text-white"
            style={{ backgroundColor: service.color || '#3B82F6' }}
          >
            {icon}
          </div>
        </div>
        <CardTitle className="text-xl font-semibold text-center text-gray-900">
          {service.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 text-center mb-4">
          {service.description}
        </p>
        
        {service.features && service.features.length > 0 && (
          <div className="space-y-2">
            {service.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span className="text-sm text-gray-600">{feature}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * ServiceCardGrid - Composite component for displaying multiple service cards in a grid
 */
interface ServiceCardGridProps {
  services: ServiceData[]
  className?: string
  columns?: 2 | 3 | 4
}

export function ServiceCardGrid({ 
  services, 
  className = "",
  columns = 4 
}: ServiceCardGridProps) {
  const gridCols = {
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3", 
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-6 ${className}`}>
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
    </div>
  )
}
