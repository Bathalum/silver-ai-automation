import { PageHeader } from "@/components/ui/page-header"
import { StatsCard } from "@/components/ui/stats-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, Zap, TrendingUp } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Welcome to your AI automation command center" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Automations"
          value="24"
          description="Running processes"
          icon={<Zap className="h-4 w-4 text-blue-600" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Total Clients"
          value="156"
          description="Active clients"
          icon={<Users className="h-4 w-4 text-green-600" />}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Efficiency Gain"
          value="87%"
          description="Average improvement"
          icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          title="Monthly Revenue"
          value="$45,230"
          description="This month"
          icon={<BarChart3 className="h-4 w-4 text-orange-600" />}
          trend={{ value: 15, isPositive: true }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest automation deployments and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New automation deployed for TechCorp</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Client onboarding completed</p>
                  <p className="text-xs text-gray-500">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Function model updated</p>
                  <p className="text-xs text-gray-500">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <button className="flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Create New Automation</span>
              </button>
              <button className="flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                <Users className="h-4 w-4 text-green-600" />
                <span className="text-sm">Add New Client</span>
              </button>
              <button className="flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <span className="text-sm">View Analytics</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
