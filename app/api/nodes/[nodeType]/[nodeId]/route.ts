// Individual Node API Route
// This file implements the REST API endpoints for individual nodes following the Presentation Layer Complete Guide

import { NextRequest, NextResponse } from 'next/server'
import { UnifiedNodeOperations } from '@/lib/application/use-cases/unified-node-operations'
import { createClient } from '@/lib/supabase/server'

// Helper function to validate request
function validateNodeRequest(nodeType: string, nodeId: string) {
  if (!nodeType || typeof nodeType !== 'string') {
    return { error: 'Invalid nodeType parameter', status: 400 }
  }
  
  if (!nodeId || typeof nodeId !== 'string') {
    return { error: 'Invalid nodeId parameter', status: 400 }
  }
  
  return null
}

// Helper function to check authentication
async function checkAuthentication(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { error: 'Unauthorized', status: 401 }
    }
    
    return { user }
  } catch (error) {
    console.error('Authentication error:', error)
    return { error: 'Authentication failed', status: 401 }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { nodeType: string; nodeId: string } }
) {
  try {
    // Log request
    console.log(`GET /api/nodes/${params.nodeType}/${params.nodeId}`)
    
    // Validate parameters
    const validationError = validateNodeRequest(params.nodeType, params.nodeId)
    if (validationError) {
      return NextResponse.json(
        { error: validationError.error },
        { status: validationError.status }
      )
    }
    
    // Check authentication
    const authResult = await checkAuthentication(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }
    
    const nodeOperations = new UnifiedNodeOperations()
    const node = await nodeOperations.getNode(params.nodeType, params.nodeId)
    
    if (!node) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(node)
  } catch (error) {
    console.error('Error fetching node:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { nodeType: string; nodeId: string } }
) {
  try {
    // Log request
    console.log(`PUT /api/nodes/${params.nodeType}/${params.nodeId}`)
    
    // Validate parameters
    const validationError = validateNodeRequest(params.nodeType, params.nodeId)
    if (validationError) {
      return NextResponse.json(
        { error: validationError.error },
        { status: validationError.status }
      )
    }
    
    // Check authentication
    const authResult = await checkAuthentication(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
    // Validate required fields based on node type
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'name is required and must be a string' },
        { status: 400 }
      )
    }
    
    const nodeOperations = new UnifiedNodeOperations()
    const updatedNode = await nodeOperations.updateNode(params.nodeType, params.nodeId, body)
    
    if (!updatedNode) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(updatedNode)
  } catch (error) {
    console.error('Error updating node:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { nodeType: string; nodeId: string } }
) {
  try {
    // Log request
    console.log(`DELETE /api/nodes/${params.nodeType}/${params.nodeId}`)
    
    // Validate parameters
    const validationError = validateNodeRequest(params.nodeType, params.nodeId)
    if (validationError) {
      return NextResponse.json(
        { error: validationError.error },
        { status: validationError.status }
      )
    }
    
    // Check authentication
    const authResult = await checkAuthentication(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }
    
    const nodeOperations = new UnifiedNodeOperations()
    const success = await nodeOperations.deleteNode(params.nodeType, params.nodeId)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Node not found or could not be deleted' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { message: 'Node deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting node:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 