import { NextRequest } from 'next/server';
import { 
  withAuth, 
  withErrorHandling, 
  withRateLimit,
  createSuccessResponse,
  createErrorResponse,
  AuthenticatedUser
} from '@/lib/api/middleware';
import { 
  AuditLogQuerySchema,
  AuditLogQuery,
  AuditLogDto,
  PaginationMeta,
  ApiErrorCode,
  HttpStatus
} from '@/lib/api/types';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: {
    modelId: string;
  };
}

/**
 * GET /api/function-models/[modelId]/audit
 * Get audit log entries for a function model
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  return withErrorHandling(
    withRateLimit(
      withAuth(async (req: NextRequest, user: AuthenticatedUser) => {
        try {
          const { modelId } = params;

          // Validate modelId format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(modelId)) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid model ID format',
              HttpStatus.BAD_REQUEST
            );
          }

          // Parse query parameters
          const url = new URL(request.url);
          const queryParams = Object.fromEntries(url.searchParams.entries());
          
          // Convert string parameters to appropriate types
          const processedParams = {
            ...queryParams,
            page: queryParams.page ? parseInt(queryParams.page) : 1,
            pageSize: queryParams.pageSize ? parseInt(queryParams.pageSize) : 50,
          };

          const validationResult = AuditLogQuerySchema.safeParse(processedParams);
          
          if (!validationResult.success) {
            return createErrorResponse(
              ApiErrorCode.VALIDATION_ERROR,
              'Invalid query parameters',
              HttpStatus.BAD_REQUEST,
              { validationErrors: validationResult.error.errors }
            );
          }

          const auditQuery: AuditLogQuery = validationResult.data;

          // Create Supabase client
          const supabase = await createClient();

          // First verify user has access to the model
          const { data: model, error: modelError } = await supabase
            .from('function_models')
            .select('permissions')
            .eq('model_id', modelId)
            .eq('deleted_at', null)
            .single();

          if (modelError || !model) {
            return createErrorResponse(
              ApiErrorCode.NOT_FOUND,
              'Function model not found',
              HttpStatus.NOT_FOUND
            );
          }

          // Check user permissions
          const permissions = model.permissions as any;
          const hasAccess = 
            permissions.owner === user.id ||
            (permissions.editors || []).includes(user.id) ||
            (permissions.viewers || []).includes(user.id);

          if (!hasAccess) {
            return createErrorResponse(
              ApiErrorCode.FORBIDDEN,
              'Insufficient permissions to view audit logs',
              HttpStatus.FORBIDDEN
            );
          }

          // Build audit log query
          let query = supabase
            .from('audit_logs')
            .select('*', { count: 'exact' })
            .eq('resource_id', modelId)
            .eq('resource_type', 'function_model')
            .order('created_at', { ascending: false });

          // Apply filters
          if (auditQuery.action) {
            query = query.eq('action', auditQuery.action);
          }

          if (auditQuery.userId) {
            query = query.eq('user_id', auditQuery.userId);
          }

          if (auditQuery.startDate) {
            query = query.gte('created_at', auditQuery.startDate);
          }

          if (auditQuery.endDate) {
            query = query.lte('created_at', auditQuery.endDate);
          }

          // Apply pagination
          const offset = (auditQuery.page - 1) * auditQuery.pageSize;
          query = query.range(offset, offset + auditQuery.pageSize - 1);

          // Execute query
          const { data: auditLogs, count, error } = await query;

          if (error) {
            console.error('Audit log query error:', error);
            return createErrorResponse(
              ApiErrorCode.INTERNAL_ERROR,
              'Failed to retrieve audit logs',
              HttpStatus.INTERNAL_SERVER_ERROR
            );
          }

          // Convert to DTOs
          const auditLogDtos: AuditLogDto[] = (auditLogs || []).map(log => ({
            id: log.id,
            resourceId: log.resource_id,
            resourceType: log.resource_type,
            action: log.action,
            userId: log.user_id,
            userEmail: log.user_email,
            details: log.details,
            ipAddress: log.ip_address,
            userAgent: log.user_agent,
            createdAt: log.created_at
          }));

          // Create pagination meta
          const totalItems = count || 0;
          const totalPages = Math.ceil(totalItems / auditQuery.pageSize);
          const paginationMeta: PaginationMeta = {
            page: auditQuery.page,
            pageSize: auditQuery.pageSize,
            totalItems,
            totalPages,
            hasNextPage: auditQuery.page < totalPages,
            hasPreviousPage: auditQuery.page > 1
          };

          return createSuccessResponse(auditLogDtos, HttpStatus.OK, {
            modelId,
            filters: {
              action: auditQuery.action,
              userId: auditQuery.userId,
              dateRange: {
                start: auditQuery.startDate,
                end: auditQuery.endDate
              }
            },
            pagination: paginationMeta
          });

        } catch (error) {
          console.error('Get audit logs error:', error);
          return createErrorResponse(
            ApiErrorCode.INTERNAL_ERROR,
            'Failed to retrieve audit logs',
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
      }),
      { maxRequests: 100, windowMs: 60000 } // 100 audit requests per minute
    )
  )(request);
}