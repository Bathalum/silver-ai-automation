import { NextRequest, NextResponse } from 'next/server';
import { swaggerSpec } from '@/lib/api/swagger';

/**
 * GET /api/docs
 * Serve OpenAPI/Swagger specification as JSON
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(swaggerSpec, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    }
  });
}