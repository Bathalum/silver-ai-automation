/**
 * Function Models Dashboard - Main List Page
 * Shows all function models and allows navigation to individual models
 */

import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createFunctionModelContainer } from '@/lib/infrastructure/di/function-model-module';
import { ServiceTokens } from '@/lib/infrastructure/di/container';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import FunctionModelTabs from './components/function-model-tabs';


export interface Model {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  nodeCount: number;
  lastUpdated: string;
  description: string;
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

async function loadModels(): Promise<{ active: Model[], archived: Model[] }> {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser();
    
    // Setup DI container
    const supabase = await createClient();
    const container = await createFunctionModelContainer(supabase);
    
    // Resolve list query handler
    const queryHandlerResult = await container.resolve(ServiceTokens.LIST_FUNCTION_MODELS_QUERY_HANDLER);
    if (queryHandlerResult.isFailure) {
      throw new Error('Failed to initialize service');
    }
    
    const queryHandler = queryHandlerResult.value;
    
    // Build single query to get all models
    const listQuery = {
      userId: user.id,
      status: undefined, // Get all models regardless of status
      searchTerm: undefined,
      limit: 100, // Increase limit to get all models
      offset: 0,
      sortBy: 'updated_at',
      sortOrder: 'desc'
    };
    
    // Execute query
    const result = await queryHandler.handle(listQuery);
    if (result.isFailure) {
      throw new Error('Failed to retrieve function models');
    }
    
    const allModels = result.value?.models || [];
    
    // Transform to UI format
    const transformModel = (model: any) => ({
      id: model.modelId,
      name: model.name,
      status: model.status.toLowerCase() as 'draft' | 'published' | 'archived',
      nodeCount: model.metadata?.nodeCount || 0,
      lastUpdated: model.updatedAt.toISOString(),
      description: model.description || 'No description available'
    });
    
    const transformedModels = allModels.map(transformModel);
    
    // Separate active and archived models
    const active = transformedModels.filter(model => model.status !== 'archived');
    const archived = transformedModels.filter(model => model.status === 'archived');
    
    return { active, archived };
    
  } catch (error) {
    console.error('Failed to load models:', error);
    return { active: [], archived: [] };
  }
}

export default async function FunctionModelDashboard() {
  const { active, archived } = await loadModels();
  const allModels = [...active, ...archived];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Function Models</h1>
          <p className="text-muted-foreground">
            Design and manage your workflow automation models
          </p>
        </div>
        
        <Button asChild>
          <Link href="/dashboard/function-model/new">
            <Plus className="w-4 h-4 mr-2" />
            New Model
          </Link>
        </Button>
      </div>

      {/* Tabbed Interface */}
      <FunctionModelTabs active={active} archived={archived} />

      {/* Empty State - Only show when no models at all */}
      {active.length === 0 && archived.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No models yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first function model
          </p>
          <Button asChild>
            <Link href="/dashboard/function-model/new">
              Create Function Model
            </Link>
          </Button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {allModels.filter(m => m.status === 'published').length}
                </p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {allModels.filter(m => m.status === 'draft').length}
                </p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <div>
                <p className="text-2xl font-bold">
                  {archived.length}
                </p>
                <p className="text-xs text-muted-foreground">Archived</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {allModels.reduce((acc, m) => acc + m.nodeCount, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Nodes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <div>
                <p className="text-2xl font-bold">{allModels.length}</p>
                <p className="text-xs text-muted-foreground">Total Models</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}