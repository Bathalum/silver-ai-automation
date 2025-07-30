"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Plus, X } from "lucide-react"
import { useKnowledgeBase } from "../hooks/use-knowledge-base"

export default function NewSOPPage() {
  const router = useRouter()
  const { createSOPNode } = useKnowledgeBase()
  const [isCreating, setIsCreating] = useState(false)
  const [newTag, setNewTag] = useState("")
  
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    content: "# New Standard Operating Procedure\n\n## Overview\n\n[Add your SOP overview here]\n\n## Steps\n\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]\n\n## Notes\n\n[Add any additional notes or considerations]",
    category: "Development",
    status: "draft" as const,
    tags: [] as string[],
    author: "Current User"
  })

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert("Please enter a title for your SOP")
      return
    }

    setIsCreating(true)
    try {
      await createSOPNode(formData)
      // Show success and redirect to knowledge base dashboard
      alert("SOP created successfully!")
      router.push("/dashboard/knowledge-base")
    } catch (error) {
      console.error("Error creating new SOP:", error)
      alert("Failed to create SOP. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const categories = ["Customer Management", "IT Operations", "Development", "Sales & Marketing"]
  const statuses = ["draft", "published", "archived"]

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Create New SOP"
        description="Create a new Standard Operating Procedure"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/knowledge-base")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isCreating || !formData.title.trim()}
          >
            <Save className="w-4 h-4 mr-2" />
            {isCreating ? "Creating..." : "Create SOP"}
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <Card>
            <CardHeader>
              <CardTitle>Title *</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter SOP title..."
                className="text-lg"
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.summary}
                onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Enter a brief summary..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>
                The main content of your Standard Operating Procedure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter the SOP content..."
                rows={15}
                className="font-mono"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category */}
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Author */}
              <div>
                <Label htmlFor="author">Author</Label>
                <Input
                  value={formData.author}
                  onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                  placeholder="Enter author name..."
                />
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag..."
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button size="sm" onClick={addTag}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Info */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Read Time:</span>
                <span>~{Math.ceil(formData.content.split('\n').length / 20)} min</span>
              </div>
              <div className="flex justify-between">
                <span>Version:</span>
                <span>v1.0</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>Today</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 