import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { FunctionModelDashboard } from "@/components/composites/function-model/function-model-dashboard"

export default function FunctionModelPage() {
  return (
    <div className="w-full h-full">
      <FunctionModelDashboard modelId="default" />
    </div>
  )
}
