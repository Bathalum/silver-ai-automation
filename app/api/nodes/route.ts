// Nodes API Route
// This file implements the REST API endpoints for nodes following the Presentation Layer Complete Guide

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

// Helper function to validate node data
function validateNodeData(node: any) {
  if (!node || typeof node !== 'object') {
    return { error: 'node is required and must be an object', status: 400 }
  }
  
  if (!node.nodeType || typeof node.nodeType !== 'string') {
    return { error: 'nodeType is required and must be a string', status: 400 }
  }
  
  if (!node.name || typeof node.name !== 'string') {
    return { error: 'name is required and must be a string', status: 400 }
  }
  
  if (!node.position || typeof node.position !== 'object') {
    return { error: 'position is required and must be an object', status: 400 }
  }
  
  if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
    return { error: 'position must have x and y coordinates as numbers', status: 400 }
  }
  
  return null
}

export async function GET(request: NextRequest) {
  try {
    // Log request
    console.log('GET /api/nodes', request.url)
    
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
    const node = await nodeOperations.getNode(nodeType, nodeId)
    
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

export async function POST(request: NextRequest) {
  try {
    // Log request
    console.log('POST /api/nodes')
    
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
    const { node } = body
    
    // Validate node data
    const validationError = validateNodeData(node)
    if (validationError) {
      return NextResponse.json(
        { error: validationError.error },
        { status: validationError.status }
      )
    }
    
    const nodeOperations = new UnifiedNodeOperations()
    const createdNode = await nodeOperations.createNode(node)
    
    return NextResponse.json(createdNode, { status: 201 })
  } catch (error) {
    console.error('Error creating node:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 