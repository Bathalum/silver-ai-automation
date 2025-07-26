import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { FunctionProcessDashboard } from "./components/function-process-dashboard"

export default function FunctionModelPage() {
  return (
    <div className="w-full h-full">
      <FunctionProcessDashboard />
    </div>
  )
}
