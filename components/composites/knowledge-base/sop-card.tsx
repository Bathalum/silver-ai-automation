"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, User, Tag, Eye, Edit, ExternalLink } from "lucide-react"
import Link from "next/link"
import type { SOP } from "@/lib/domain/entities/knowledge-base-types"

interface SOPCardProps {
  sop: SOP
  onEdit?: (sop: SOP) => void
  onView?: (sop: SOP) => void
}

export function SOPCard({ sop, onEdit, onView }: SOPCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getAuthorInitials = (author: string) => {
    return author
      .split(" ")
      .map(name => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold line-clamp-2 mb-2">
              {sop.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-sm text-muted-foreground">
              {sop.summary}
            </CardDescription>
          </div>
          <Badge className={`ml-2 flex-shrink-0 ${getStatusColor(sop.status)}`}>
            {sop.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Tags */}
        {sop.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {sop.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {sop.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{sop.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{sop.readTime} min read</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{sop.author}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>v{sop.version}</span>
          </div>
        </div>

        {/* Linked Entities */}
        {(sop.linkedFunctionModels.length > 0 || 
          sop.linkedEventStorms.length > 0 || 
          sop.linkedSpindles.length > 0) && (
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-1">Linked to:</div>
            <div className="flex flex-wrap gap-1">
              {sop.linkedFunctionModels.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {sop.linkedFunctionModels.length} Function Models
                </Badge>
              )}
              {sop.linkedEventStorms.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {sop.linkedEventStorms.length} Event Storms
                </Badge>
              )}
              {sop.linkedSpindles.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {sop.linkedSpindles.length} Spindles
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {getAuthorInitials(sop.author)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {sop.updatedAt.toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(sop)}
                className="h-8 px-2"
              >
                <Edit className="w-3 h-3" />
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              asChild
              className="h-8 px-3"
            >
              <Link href={`/dashboard/knowledge-base/${sop.id}`}>
                <ExternalLink className="w-3 h-3 mr-1" />
                View
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 