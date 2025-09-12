'use client'

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { deleteModelFormAction } from '@/app/actions/model-actions';

export interface Model {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  nodeCount: number;
  lastUpdated: string;
  description: string;
}

interface FunctionModelTabsProps {
  active: Model[];
  archived: Model[];
}

export default function FunctionModelTabs({ active, archived }: FunctionModelTabsProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderModelCard = (model: Model) => (
    <Card key={model.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg truncate">
              {model.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {model.description}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className={getStatusColor(model.status)}
          >
            {model.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              {model.nodeCount} nodes
            </div>
            <div>
              Updated {formatDate(model.lastUpdated)}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link href={`/dashboard/function-model/${model.id}`}>
                <Eye className="w-3 h-3 mr-1" />
                View
              </Link>
            </Button>
            
            {model.status !== 'archived' && (
              <Button variant="outline" size="sm" asChild className="flex-1">
                <Link href={`/dashboard/function-model/${model.id}/edit`}>
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Link>
              </Button>
            )}
            
            {model.status !== 'archived' && (
              <form action={deleteModelFormAction}>
                <input type="hidden" name="modelId" value={model.id} />
                <Button 
                  type="submit"
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Tabs defaultValue="active" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="active" className="relative">
          Active Models
          {active.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {active.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="archived" className="relative">
          Archived Models
          {archived.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {archived.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="space-y-6">
        {active.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {active.map(renderModelCard)}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No active models</h3>
            <p className="text-muted-foreground mb-4">
              Your active models will appear here once created.
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="archived" className="space-y-6">
        {archived.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {archived.map(renderModelCard)}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No archived models</h3>
            <p className="text-muted-foreground mb-4">
              Models you archive will appear here for reference.
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}