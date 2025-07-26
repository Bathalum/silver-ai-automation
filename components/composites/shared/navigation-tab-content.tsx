import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { NAVIGATION_TAB_CONFIG } from "./constants"

interface NavigationTabContentProps {
  tabType: "function-model" | "event-storm" | "spindle" | "knowledge-base"
  onNavigate: () => void
}

export function NavigationTabContent({ 
  tabType, 
  onNavigate 
}: NavigationTabContentProps) {
  const config = NAVIGATION_TAB_CONFIG[tabType]
  const Icon = config.icon

  return (
    <div className="text-center py-8">
      <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
        <Icon className={`w-8 h-8 ${config.iconColor}`} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
      <p className="text-muted-foreground mb-4">
        {config.description}
      </p>
      <Button onClick={onNavigate} className="gap-2">
        <ArrowRight className="w-4 h-4" />
        Go to {config.title}
      </Button>
    </div>
  )
} 