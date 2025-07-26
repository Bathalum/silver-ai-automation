import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatsCard({ title, value, description, icon, trend }: StatsCardProps) {
  return (
    <Card className="hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-1 group border-0 shadow-md bg-white/90 backdrop-blur-sm hover:bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors duration-300">
          {title}
        </CardTitle>
        <div className="group-hover:scale-110 transition-transform duration-300">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
          {value}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <p className={`text-xs mt-2 font-medium ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
            <span className="inline-block group-hover:scale-110 transition-transform duration-300">
              {trend.isPositive ? "↗" : "↘"}
            </span>{" "}
            {trend.isPositive ? "+" : ""}
            {trend.value}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  )
}
