"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, Eye, Trash2, Plus, X } from "lucide-react"
import { useSOPById } from "../hooks/use-knowledge-base"
import type { SOP } from "@/lib/domain/entities/knowledge-base-types"

interface SOPEditPageProps {
  params: {
    id: string
  }
}

export default function SOPEditPage({ params }: SOPEditPageProps) {
  const router = useRouter()
  const { sop, loading, error, updateSOP, deleteSOP, reload } = useSOPById(params.id)
  
  const [formData, setFormData] = useState<Partial<SOP>>({
    title: "",
    summary: "",
    content: "",
    category: "",
    status: "draft",
    tags: [],
    author: ""
  })
  
  const [isEditing, setIsEditing] = useState(false) // Start in view mode by default
  const [newTag, setNewTag] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Initialize form data when SOP loads
  useEffect(() => {
    if (sop) {
      setFormData({
        title: sop.title || "",
        summary: sop.summary || "",
        content: sop.content || "",
        category: sop.category || "",
        status: sop.status || "draft",
        tags: sop.tags || [],
        author: sop.author || ""
      })
    }
  }, [sop])

  const handleSave = async () => {
    if (!sop) return
    
    setIsSaving(true)
    try {
      await updateSOP(formData)
      setIsEditing(false)
      await reload()
    } catch (error) {
      console.error("Error saving SOP:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!sop || !confirm("Are you sure you want to delete this SOP?")) return
    
    try {
      await deleteSOP()
      router.push("/dashboard/knowledge-base")
    } catch (error) {
      console.error("Error deleting SOP:", error)
    }
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }))
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }))
  }

  const categories = ["Customer Management", "IT Operations", "Development", "Sales & Marketing"]
  const statuses = ["draft", "published", "archived"]

  if (loading) {
    return (
      <div className="w-full h-full p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !sop) {
    return (
      <div className="w-full h-full p-6">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">SOP not found</h3>
            <p className="text-muted-foreground mb-4">
              The SOP you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={() => router.push("/dashboard/knowledge-base")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Knowledge Base
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title={isEditing ? "Edit SOP" : sop.title}
        description={isEditing ? "Update the SOP content and metadata" : sop.summary}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/knowledge-base")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          {!isEditing && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          
          {isEditing && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <Card>
            <CardHeader>
              <CardTitle>Title</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter SOP title..."
                />
              ) : (
                <p className="text-lg font-medium">{sop.title}</p>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Enter a brief summary..."
                  rows={3}
                />
              ) : (
                <p className="text-muted-foreground">{sop.summary}</p>
              )}
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
              {isEditing ? (
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter the SOP content..."
                  rows={15}
                  className="font-mono"
                />
              ) : (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded">
                    {sop.content}
                  </pre>
                </div>
              )}
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
                {isEditing ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground">{sop.category}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Status</Label>
                {isEditing ? (
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
                ) : (
                  <Badge variant="outline" className="capitalize">
                    {sop.status}
                  </Badge>
                )}
              </div>

              {/* Author */}
              <div>
                <Label htmlFor="author">Author</Label>
                {isEditing ? (
                  <Input
                    value={formData.author}
                    onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    placeholder="Enter author name..."
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{sop.author}</p>
                )}
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                {isEditing ? (
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
                      {formData.tags?.map((tag) => (
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
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {sop.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Read Time:</span>
                <span>{sop.readTime} min</span>
              </div>
              <div className="flex justify-between">
                <span>Version:</span>
                <span>v{sop.version}</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{sop.createdAt.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated:</span>
                <span>{sop.updatedAt.toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 