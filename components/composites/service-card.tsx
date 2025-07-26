import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Service } from "@/lib/domain/entities/service"

interface ServiceCardProps {
  service: Service
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Card className="h-full hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-2 group border-0 shadow-md bg-white/80 backdrop-blur-sm hover:bg-white">
      <CardHeader className="relative">
        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{service.icon}</div>
        <CardTitle className="text-xl group-hover:text-blue-600 transition-colors duration-300">
          {service.title}
        </CardTitle>
        <CardDescription className="text-gray-600 leading-relaxed">{service.description}</CardDescription>

        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {service.features.map((feature, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs hover:bg-blue-100 hover:text-blue-700 transition-colors duration-300 cursor-default"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {feature}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
