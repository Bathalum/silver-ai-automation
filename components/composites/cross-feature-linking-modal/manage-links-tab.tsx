'use client'

import { CrossFeatureLink, getLinkIcon, getFeatureIcon } from '@/lib/domain/entities/cross-feature-link-types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Link, AlertCircle, Trash2, ExternalLink } from 'lucide-react'

interface ManageLinksTabProps {
  links: CrossFeatureLink[]
  loading: boolean
  error: string | null
  onDeleteLink: (linkId: string) => void
  clearError: () => void
}

export function ManageLinksTab({
  links,
  loading,
  error,
  onDeleteLink,
  clearError
}: ManageLinksTabProps) {
  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="link"
              size="sm"
              onClick={clearError}
              className="p-0 h-auto ml-2"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No links created yet</p>
          <p className="text-sm">Create your first link in the Create Link tab</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <LinkCard
              key={link.linkId}
              link={link}
              onDelete={() => onDeleteLink(link.linkId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface LinkCardProps {
  link: CrossFeatureLink
  onDelete: () => void
}

function LinkCard({ link, onDelete }: LinkCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getLinkIcon(link.linkType)}</span>
            <CardTitle className="text-sm">
              {link.linkType.charAt(0).toUpperCase() + link.linkType.slice(1)} {link.targetFeature}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {link.linkStrength.toFixed(1)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {/* Target Info */}
          <div className="flex items-center gap-2">
            <span className="text-sm">{getFeatureIcon(link.targetFeature)}</span>
            <span className="text-sm font-medium">{link.targetId}</span>
            <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>

          {/* Link Context */}
          {link.linkContext && Object.keys(link.linkContext).length > 0 && (
            <div className="text-xs text-muted-foreground">
              {Object.entries(link.linkContext).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
            </div>
          )}

          {/* Created Date */}
          <div className="text-xs text-muted-foreground">
            Created: {link.createdAt.toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 