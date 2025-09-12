import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse, ApiErrorCode, HttpStatus } from './types';

/**
 * Authenticated user context
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role?: string;
}

/**
 * API handler with authentication and error handling
 */
export type AuthenticatedApiHandler<T = any> = (
  request: NextRequest,
  user: AuthenticatedUser,
  params?: Record<string, string>
) => Promise<NextResponse<ApiResponse<T>>>;

/**
 * API handler without authentication
 */
export type ApiHandler<T = any> = (
  request: NextRequest,
  params?: Record<string, string>
) => Promise<NextResponse<ApiResponse<T>>>;

/**
 * Authentication middleware
 */
export function withAuth<T>(
  handler: AuthenticatedApiHandler<T>
): ApiHandler<T> {
  return async (request: NextRequest, params?: Record<string, string>) => {
    try {
      // Get user from Supabase auth
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return createErrorResponse(
          ApiErrorCode.UNAUTHORIZED,
          'Authentication required',
          HttpStatus.UNAUTHORIZED
        );
      }

      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email || '',
        role: user.user_metadata?.role
      };

      return handler(request, authenticatedUser, params);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return createErrorResponse(
        ApiErrorCode.INTERNAL_ERROR,
        'Authentication service unavailable',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };
}

/**
 * Request validation middleware
 */
export function withValidation<TSchema extends z.ZodSchema, TData = any>(
  schema: TSchema,
  handler: (
    request: NextRequest,
    validatedData: z.infer<TSchema>,
    user?: AuthenticatedUser,
    params?: Record<string, string>
  ) => Promise<NextResponse<ApiResponse<TData>>>
): ApiHandler<TData> {
  return async (request: NextRequest, params?: Record<string, string>) => {
    try {
      let data: any;

      // Parse request data based on method
      if (request.method === 'GET') {
        // Parse query parameters for GET requests
        const url = new URL(request.url);
        const queryParams = Object.fromEntries(url.searchParams.entries());
        data = queryParams;
      } else {
        // Parse JSON body for other methods
        try {
          data = await request.json();
        } catch (error) {
          return createErrorResponse(
            ApiErrorCode.VALIDATION_ERROR,
            'Invalid JSON in request body',
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Validate data against schema
      const validationResult = schema.safeParse(data);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Request validation failed',
          HttpStatus.BAD_REQUEST,
          { validationErrors: errorDetails }
        );
      }

      return handler(request, validationResult.data, undefined, params);
    } catch (error) {
      console.error('Validation middleware error:', error);
      return createErrorResponse(
        ApiErrorCode.INTERNAL_ERROR,
        'Request processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };
}

/**
 * Combined authentication and validation middleware
 */
export function withAuthAndValidation<TSchema extends z.ZodSchema, TData = any>(
  schema: TSchema,
  handler: (
    request: NextRequest,
    validatedData: z.infer<TSchema>,
    user: AuthenticatedUser,
    params?: Record<string, string>
  ) => Promise<NextResponse<ApiResponse<TData>>>
): ApiHandler<TData> {
  return withAuth(async (request, user, params) => {
    const validationHandler = withValidation(schema, 
      (req, data, _, p) => handler(req, data, user, p)
    );
    return validationHandler(request, params);
  });
}

/**
 * Error handling middleware
 */
export function withErrorHandling<T>(
  handler: ApiHandler<T>
): ApiHandler<T> {
  return async (request: NextRequest, params?: Record<string, string>) => {
    try {
      return await handler(request, params);
    } catch (error) {
      console.error('API handler error:', error);
      
      // Handle known error types
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          ApiErrorCode.VALIDATION_ERROR,
          'Request validation failed',
          HttpStatus.BAD_REQUEST,
          { validationErrors: error.errors }
        );
      }

      // Handle database errors
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as { code: string; message: string };
        if (dbError.code === '23505') {
          return createErrorResponse(
            ApiErrorCode.CONFLICT,
            'Resource already exists',
            HttpStatus.CONFLICT
          );
        }
        if (dbError.code === '23503') {
          return createErrorResponse(
            ApiErrorCode.NOT_FOUND,
            'Referenced resource not found',
            HttpStatus.BAD_REQUEST
          );
        }
      }

      // Default to internal server error
      return createErrorResponse(
        ApiErrorCode.INTERNAL_ERROR,
        'An unexpected error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  };
}

/**
 * CORS middleware
 */
export function withCors<T>(
  handler: ApiHandler<T>,
  options: {
    origin?: string | string[];
    methods?: string[];
    headers?: string[];
  } = {}
): ApiHandler<T> {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization', 'X-Requested-With']
  } = options;

  return async (request: NextRequest, params?: Record<string, string>) => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': Array.isArray(origin) ? origin.join(', ') : origin,
          'Access-Control-Allow-Methods': methods.join(', '),
          'Access-Control-Allow-Headers': headers.join(', '),
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    const response = await handler(request, params);

    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', Array.isArray(origin) ? origin.join(', ') : origin);
    response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', headers.join(', '));

    return response;
  };
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit<T>(
  handler: ApiHandler<T>,
  options: {
    windowMs?: number;
    maxRequests?: number;
  } = {}
): ApiHandler<T> {
  const { windowMs = 60000, maxRequests = 100 } = options; // 100 requests per minute by default

  return async (request: NextRequest, params?: Record<string, string>) => {
    const clientId = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    const clientData = rateLimitMap.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize rate limit data
      rateLimitMap.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
    } else {
      // Check if limit exceeded
      if (clientData.count >= maxRequests) {
        return createErrorResponse(
          ApiErrorCode.RATE_LIMITED,
          'Rate limit exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
          {
            resetTime: new Date(clientData.resetTime).toISOString(),
            maxRequests,
            windowMs
          }
        );
      }
      
      clientData.count++;
    }

    return handler(request, params);
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = HttpStatus.OK,
  meta?: ApiResponse<T>['meta']
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...meta
    }
  };

  return NextResponse.json(response, { status });
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  status: number = HttpStatus.BAD_REQUEST,
  details?: Record<string, any>
): NextResponse<ApiResponse<never>> {
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      details
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };

  return NextResponse.json(response, { status });
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}