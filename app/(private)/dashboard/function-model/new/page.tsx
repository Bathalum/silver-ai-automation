/**
 * Create New Function Model Page
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createModelAction } from '@/app/actions/model-actions';

export default function NewFunctionModel() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Create FormData from form state
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('name', formData.name);
      formDataToSubmit.append('description', formData.description);
      
      // Call real Server Action - it will redirect automatically on success
      await createModelAction(formDataToSubmit);
    } catch (error) {
      console.error('Failed to create model:', error);
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

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/function-model">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold">Create New Function Model</h1>
          <p className="text-muted-foreground">
            Set up a new workflow automation model
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Model Details</CardTitle>
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
                A descriptive name for your workflow model
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
                Optional description to help identify this model's purpose
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
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Model
                  </>
                )}
              </Button>
              
              <Button variant="outline" type="button" asChild>
                <Link href="/dashboard/function-model">
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Getting Started</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div>
              <p className="font-medium">Create your model</p>
              <p className="text-sm text-muted-foreground">
                Start by giving your workflow a name and description
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div>
              <p className="font-medium">Design your workflow</p>
              <p className="text-sm text-muted-foreground">
                Add nodes to define the steps in your automation process
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
              3
            </div>
            <div>
              <p className="font-medium">Connect and configure</p>
              <p className="text-sm text-muted-foreground">
                Link nodes together and configure their behavior
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
              4
            </div>
            <div>
              <p className="font-medium">Test and deploy</p>
              <p className="text-sm text-muted-foreground">
                Validate your workflow and publish it for execution
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}