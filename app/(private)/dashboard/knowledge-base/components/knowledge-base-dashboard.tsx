"use client"

import { useState } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, BookOpen, FileText, Users, Clock } from "lucide-react"
import { SOPCard } from "@/components/composites/knowledge-base/sop-card"
import { KnowledgeBaseSearch } from "@/components/composites/knowledge-base/knowledge-base-search"
import { useKnowledgeBase } from "../hooks/use-knowledge-base"
import type { SOP } from "@/lib/domain/entities/knowledge-base-types"

export function KnowledgeBaseDashboard() {
  const { sops, loading, filters, updateFilters, clearFilters } = useKnowledgeBase()
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("")

  const categories = ["Customer Management", "IT Operations", "Development", "Sales & Marketing"]
  const statuses = ["published", "draft", "archived"]

  const handleSearch = (query: string) => {
    updateFilters({ search: query })
  }

  const handleCategoryFilter = (category: string) => {
    const newCategory = selectedCategory === category ? "" : category
    setSelectedCategory(newCategory)
    updateFilters({ category: newCategory })
  }

  const handleStatusFilter = (status: string) => {
    const newStatus = selectedStatus === status ? "" : status
    setSelectedStatus(newStatus)
    updateFilters({ status: newStatus })
  }

  const handleClearFilters = () => {
    setSelectedCategory("")
    setSelectedStatus("")
    clearFilters()
  }

  const stats = {
    total: sops.length,
    published: sops.filter(sop => sop.status === "published").length,
    draft: sops.filter(sop => sop.status === "draft").length,
    archived: sops.filter(sop => sop.status === "archived").length
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Knowledge Base"
        description="Manage and organize your Standard Operating Procedures (SOPs)"
      >
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New SOP
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SOPs</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              All procedures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
            <p className="text-xs text-muted-foreground">
              Live procedures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.archived}</div>
            <p className="text-xs text-muted-foreground">
              Retired procedures
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Find the SOPs you need quickly and efficiently
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <KnowledgeBaseSearch
            onSearch={handleSearch}
            onClear={() => updateFilters({ search: "" })}
            placeholder="Search by title, content, or tags..."
          />

          {/* Category Filters */}
          <div>
            <h4 className="text-sm font-medium mb-2">Categories</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => handleCategoryFilter(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Status Filters */}
          <div>
            <h4 className="text-sm font-medium mb-2">Status</h4>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <Badge
                  key={status}
                  variant={selectedStatus === status ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 capitalize"
                  onClick={() => handleStatusFilter(status)}
                >
                  {status}
                </Badge>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {(selectedCategory || selectedStatus || filters.search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground"
            >
              Clear all filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* SOPs Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            Standard Operating Procedures
          </h2>
          <p className="text-sm text-muted-foreground">
            {sops.length} {sops.length === 1 ? 'procedure' : 'procedures'} found
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sops.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sops.map((sop) => (
              <SOPCard
                key={sop.id}
                sop={sop}
                onEdit={(sop) => console.log("Edit SOP:", sop)}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No SOPs found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || selectedCategory || selectedStatus
                  ? "Try adjusting your search criteria or filters."
                  : "Get started by creating your first Standard Operating Procedure."}
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create SOP
              </Button>
            </CardContent>
          </Card>
        )}
      </div>


    </div>
  )
} 