// Node Links API Route
// This file implements the REST API endpoints for node links following the Presentation Layer Complete Guide

import { NextRequest, NextResponse } from 'next/server'
import { UnifiedNodeOperations } from '@/lib/application/use-cases/unified-node-operations'
import { createClient } from '@/lib/supabase/server'

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

// Helper function to validate link data
function validateLinkData(linkData: any) {
  if (!linkData || typeof linkData !== 'object') {
    return { error: 'link data is required and must be an object', status: 400 }
  }
  
  if (!linkData.sourceNodeType || typeof linkData.sourceNodeType !== 'string') {
    return { error: 'sourceNodeType is required and must be a string', status: 400 }
  }
  
  if (!linkData.sourceNodeId || typeof linkData.sourceNodeId !== 'string') {
    return { error: 'sourceNodeId is required and must be a string', status: 400 }
  }
  
  if (!linkData.targetNodeType || typeof linkData.targetNodeType !== 'string') {
    return { error: 'targetNodeType is required and must be a string', status: 400 }
  }
  
  if (!linkData.targetNodeId || typeof linkData.targetNodeId !== 'string') {
    return { error: 'targetNodeId is required and must be a string', status: 400 }
  }
  
  if (!linkData.linkType || typeof linkData.linkType !== 'string') {
    return { error: 'linkType is required and must be a string', status: 400 }
  }
  
  return null
}

export async function GET(request: NextRequest) {
  try {
    // Log request
    console.log('GET /api/node-links', request.url)
    
    // Check authentication
    const authResult = await checkAuthentication(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const nodeType = searchParams.get('nodeType')
    const nodeId = searchParams.get('nodeId')
    
    if (!nodeType || !nodeId) {
      return NextResponse.json(
        { error: 'nodeType and nodeId are required' },
        { status: 400 }
      )
    }
    
    const nodeOperations = new UnifiedNodeOperations()
    const links = await nodeOperations.getNodeLinks(nodeType, nodeId)
    
    return NextResponse.json(links)
  } catch (error) {
    console.error('Error fetching node links:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Log request
    console.log('POST /api/node-links')
    
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
    const { sourceNodeType, sourceNodeId, targetNodeType, targetNodeId, linkType } = body
    
    // Validate link data
    const validationError = validateLinkData({
      sourceNodeType,
      sourceNodeId,
      targetNodeType,
      targetNodeId,
      linkType
    })
    
    if (validationError) {
      return NextResponse.json(
        { error: validationError.error },
        { status: validationError.status }
      )
    }
    
    const nodeOperations = new UnifiedNodeOperations()
    const link = await nodeOperations.createNodeLink({
      sourceNodeType,
      sourceNodeId,
      targetNodeType,
      targetNodeId,
      linkType,
      linkStrength: 1.0,
      linkContext: {},
      visualProperties: {},
      createdBy: authResult.user.id
    })
    
    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error('Error creating node link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Log request
    console.log('DELETE /api/node-links')
    
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
    const { linkId } = body
    
    if (!linkId || typeof linkId !== 'string') {
      return NextResponse.json(
        { error: 'linkId is required and must be a string' },
        { status: 400 }
      )
    }
    
    const nodeOperations = new UnifiedNodeOperations()
    const success = await nodeOperations.deleteNodeLink(linkId)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Link not found or could not be deleted' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { message: 'Link deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting node link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 