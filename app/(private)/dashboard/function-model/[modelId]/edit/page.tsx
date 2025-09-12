/**
 * Edit Function Model Page
 * Edit model metadata and settings (not the workflow canvas)
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Eye, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateModelAction } from '@/app/actions/model-actions';

interface EditFunctionModelProps {
  params: {
    modelId: string;
  };
}

export default function EditFunctionModel({ params }: EditFunctionModelProps) {
  const { modelId } = params;
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    status: 'draft' as 'draft' | 'published' | 'archived'
  });

  // Load model data from API
  React.useEffect(() => {
    const loadModelData = async () => {
      try {
        const response = await fetch(`/api/function-models/${modelId}?includeNodes=false&includeStatistics=false`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setFormData({
              name: data.data.name,
              description: data.data.description || '',
              status: data.data.status.toLowerCase() as 'draft' | 'published' | 'archived'
            });
          }
        }
      } catch (error) {
        console.error('Failed to load model:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadModelData();
  }, [modelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Create FormData for Server Action
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('name', formData.name);
      formDataToSubmit.append('description', formData.description);
      // Note: status updates might need separate Server Action based on your domain rules
      
      // Call real Server Action
      const result = await updateModelAction(modelId, formDataToSubmit);
      if (result.success) {
        // Navigate back to model view
        router.push(`/dashboard/function-model/${modelId}`);
      } else {
        console.error('Failed to update model:', result.error);
      }
    } catch (error) {
      console.error('Failed to update model:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
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

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            Loading model...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/function-model/${modelId}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Edit Model</h1>
            <Badge 
              variant="outline" 
              className={getStatusColor(formData.status)}
            >
              {formData.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Update model information and settings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/function-model/${modelId}`}>
              <Eye className="w-4 h-4 mr-1" />
              View Canvas
            </Link>
          </Button>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Model Settings
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Model Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Model Name</Label>
              <Input
                id="name"
                placeholder="Enter model name"
                value={formData.name}
                onChange={handleInputChange('name')}
                required
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                The display name for this workflow model
              </p>
            </div>

            {/* Model Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this model does..."
                value={formData.description}
                onChange={handleInputChange('description')}
                rows={4}
                className="w-full resize-none"
              />
              <p className="text-xs text-muted-foreground">
                A detailed description of this model's purpose and functionality
              </p>
            </div>

            {/* Model Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  status: e.target.value as typeof formData.status 
                }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Controls the visibility and execution availability of this model
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={!formData.name.trim() || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              
              <Button variant="outline" type="button" asChild>
                <Link href={`/dashboard/function-model/${modelId}`}>
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Model Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Model Information</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Model ID</p>
              <p className="font-mono">{modelId}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Created</p>
              <p>September 8, 2025</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Last Modified</p>
              <p>September 10, 2025</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Version</p>
              <p>1.0.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}