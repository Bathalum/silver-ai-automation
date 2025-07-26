"use client"

import { useParams } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Edit, Share, Bookmark, Download, Clock, User, Tag, Eye } from "lucide-react"
import Link from "next/link"
import { useSOPById } from "../hooks/use-knowledge-base"
import { generateTableOfContents } from "@/lib/utils/table-of-contents"

export default function SOPDetailPage() {
  const params = useParams()
  const sopId = params.id as string
  const { sop, loading, error } = useSOPById(sopId)

  if (loading) {
    return (
      <div className="w-full h-full p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error || !sop) {
    return (
      <div className="w-full h-full p-6">
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-medium mb-2">SOP not found</h3>
            <p className="text-muted-foreground mb-4">
              The SOP you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/dashboard/knowledge-base">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Knowledge Base
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const tableOfContents = generateTableOfContents(sop.content)

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/knowledge-base">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <PageHeader
              title={sop.title}
              description={sop.summary}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Bookmark className="w-4 h-4 mr-2" />
            Bookmark
          </Button>
          <Button variant="outline" size="sm">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant={sop.status === "published" ? "default" : "secondary"}>
                    {sop.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Version {sop.version}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{sop.readTime} min read</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>v{sop.version}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap font-sans">{sop.content}</pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{sop.author}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Created: {sop.createdAt.toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Updated: {sop.updatedAt.toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Category: {sop.category}
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {sop.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {sop.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table of Contents */}
          {tableOfContents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Table of Contents</CardTitle>
              </CardHeader>
              <CardContent>
                <nav className="space-y-1">
                  {tableOfContents.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`block text-sm hover:text-primary transition-colors ${
                        item.level === 1 ? "font-medium" : "ml-4"
                      }`}
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </CardContent>
            </Card>
          )}

          {/* Linked Entities */}
          {(sop.linkedFunctionModels.length > 0 || 
            sop.linkedEventStorms.length > 0 || 
            sop.linkedSpindles.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sop.linkedFunctionModels.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Function Models:</span> {sop.linkedFunctionModels.length}
                  </div>
                )}
                {sop.linkedEventStorms.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Event Storms:</span> {sop.linkedEventStorms.length}
                  </div>
                )}
                {sop.linkedSpindles.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Spindles:</span> {sop.linkedSpindles.length}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 