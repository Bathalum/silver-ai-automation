import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Knowledge Base" description="Centralized repository of automation knowledge and documentation">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Article
        </Button>
      </PageHeader>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search knowledge base..." className="pl-10" />
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Articles</CardTitle>
            <CardDescription>Latest knowledge base entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">AI Automation Best Practices</h3>
                  <p className="text-sm text-gray-500">Updated 3 days ago</p>
                </div>
                <Button variant="outline" size="sm">
                  Read
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Client Onboarding Checklist</h3>
                  <p className="text-sm text-gray-500">Updated 1 week ago</p>
                </div>
                <Button variant="outline" size="sm">
                  Read
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
