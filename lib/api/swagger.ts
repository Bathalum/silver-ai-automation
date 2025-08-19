/**
 * OpenAPI/Swagger specification for Function Model API
 */
export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Function Model API',
    description: 'REST API for managing Function Model workflows with Clean Architecture principles',
    version: '1.0.0',
    contact: {
      name: 'API Support',
      email: 'support@example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: '/api',
      description: 'Development server'
    }
  ],
  paths: {
    '/function-models': {
      get: {
        summary: 'List Function Models',
        description: 'Retrieve a paginated list of function models for the authenticated user',
        tags: ['Function Models'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number'
          },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page'
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['draft', 'published', 'archived'] },
            description: 'Filter by model status'
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search term for model name or description'
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: { 
              type: 'string', 
              enum: ['name', 'created_at', 'updated_at', 'last_saved_at'],
              default: 'updated_at'
            },
            description: 'Sort field'
          },
          {
            name: 'sortOrder',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            description: 'Sort direction'
          }
        ],
        responses: {
          '200': {
            description: 'List of function models',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ModelDto' }
                        },
                        meta: {
                          allOf: [
                            { $ref: '#/components/schemas/ApiResponse/properties/meta' },
                            {
                              type: 'object',
                              properties: {
                                pagination: { $ref: '#/components/schemas/PaginationMeta' }
                              }
                            }
                          ]
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      post: {
        summary: 'Create Function Model',
        description: 'Create a new function model',
        tags: ['Function Models'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateModelRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Function model created successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/ModelDto' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': { $ref: '#/components/responses/Conflict' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/function-models/{modelId}': {
      get: {
        summary: 'Get Function Model',
        description: 'Retrieve a specific function model by ID',
        tags: ['Function Models'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          },
          {
            name: 'includeNodes',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Include container nodes in response'
          },
          {
            name: 'includeActionNodes',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Include action nodes in response'
          },
          {
            name: 'includeStatistics',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Include model statistics in response'
          }
        ],
        responses: {
          '200': {
            description: 'Function model details',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/ModelDto' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      put: {
        summary: 'Update Function Model',
        description: 'Update function model metadata',
        tags: ['Function Models'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateModelRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Function model updated successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/ModelDto' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      delete: {
        summary: 'Delete Function Model',
        description: 'Soft delete a function model (only owner can delete)',
        tags: ['Function Models'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          }
        ],
        responses: {
          '204': {
            description: 'Function model deleted successfully'
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/function-models/{modelId}/publish': {
      post: {
        summary: 'Publish Function Model',
        description: 'Publish a function model to production with version control',
        tags: ['Model Operations'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PublishModelRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Function model published successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/ModelDto' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/function-models/{modelId}/nodes': {
      get: {
        summary: 'Get Model Nodes',
        description: 'Retrieve all container nodes for a function model',
        tags: ['Node Management'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          }
        ],
        responses: {
          '200': {
            description: 'List of container nodes',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/NodeDto' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      post: {
        summary: 'Add Container Node',
        description: 'Add a new container node to a function model',
        tags: ['Node Management'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddNodeRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Container node added successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/NodeDto' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/function-models/{modelId}/actions': {
      get: {
        summary: 'Get Model Actions',
        description: 'Retrieve all action nodes for a function model',
        tags: ['Action Management'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          },
          {
            name: 'parentNodeId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            description: 'Filter by parent node ID'
          }
        ],
        responses: {
          '200': {
            description: 'List of action nodes',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ActionNodeDto' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      post: {
        summary: 'Add Action Node',
        description: 'Add a new action node to a function model',
        tags: ['Action Management'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddActionRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Action node added successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/ActionNodeDto' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/function-models/search': {
      get: {
        summary: 'Search Function Models',
        description: 'Advanced search for function models with filtering and pagination',
        tags: ['Advanced Features'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'query',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search term for model name or description'
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['draft', 'published', 'archived'] },
            description: 'Filter by model status'
          },
          {
            name: 'tags',
            in: 'query',
            schema: { type: 'array', items: { type: 'string' } },
            description: 'Filter by tags'
          },
          {
            name: 'createdAfter',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter models created after this date'
          },
          {
            name: 'createdBefore',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter models created before this date'
          },
          {
            name: 'includeArchived',
            in: 'query',
            schema: { type: 'boolean', default: false },
            description: 'Include archived models in results'
          },
          {
            name: 'sortBy',
            in: 'query',
            schema: { 
              type: 'string', 
              enum: ['name', 'created_at', 'updated_at', 'last_saved_at'],
              default: 'updated_at'
            },
            description: 'Sort field'
          },
          {
            name: 'sortOrder',
            in: 'query',
            schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            description: 'Sort direction'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number'
          },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page'
          }
        ],
        responses: {
          '200': {
            description: 'Search results with applied filters',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ModelDto' }
                        },
                        meta: {
                          allOf: [
                            { $ref: '#/components/schemas/ApiResponse/properties/meta' },
                            {
                              type: 'object',
                              properties: {
                                searchQuery: { type: 'string' },
                                appliedFilters: { type: 'object' },
                                pagination: { $ref: '#/components/schemas/PaginationMeta' }
                              }
                            }
                          ]
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/TooManyRequests' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/function-models/{modelId}/statistics': {
      get: {
        summary: 'Get Model Statistics',
        description: 'Get comprehensive statistics and analytics for a function model',
        tags: ['Advanced Features'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          }
        ],
        responses: {
          '200': {
            description: 'Model statistics and analytics',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/ModelStatisticsDto' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/function-models/{modelId}/audit': {
      get: {
        summary: 'Get Audit Logs',
        description: 'Retrieve audit log entries for a function model',
        tags: ['Advanced Features'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          },
          {
            name: 'action',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by action type'
          },
          {
            name: 'userId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            description: 'Filter by user ID'
          },
          {
            name: 'startDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter entries after this date'
          },
          {
            name: 'endDate',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
            description: 'Filter entries before this date'
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number'
          },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            description: 'Number of items per page'
          }
        ],
        responses: {
          '200': {
            description: 'Audit log entries',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/AuditLogDto' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/function-models/{modelId}/execute': {
      post: {
        summary: 'Execute Workflow',
        description: 'Execute a function model workflow with optional input data',
        tags: ['Workflow Execution'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ExecuteWorkflowRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Workflow execution completed (sync mode)',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/WorkflowExecutionDto' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '202': {
            description: 'Workflow execution started (async mode)',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/WorkflowExecutionDto' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      get: {
        summary: 'Get Execution Status',
        description: 'Get the status and results of a workflow execution',
        tags: ['Workflow Execution'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'modelId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Function model ID'
          },
          {
            name: 'executionId',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Execution ID to check status'
          }
        ],
        responses: {
          '200': {
            description: 'Execution status and results',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/WorkflowExecutionDto' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase JWT token'
      }
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' }
            }
          },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              requestId: { type: 'string' }
            }
          }
        },
        required: ['success']
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          pageSize: { type: 'integer', minimum: 1 },
          totalItems: { type: 'integer', minimum: 0 },
          totalPages: { type: 'integer', minimum: 0 },
          hasNextPage: { type: 'boolean' },
          hasPreviousPage: { type: 'boolean' }
        },
        required: ['page', 'pageSize', 'totalItems', 'totalPages', 'hasNextPage', 'hasPreviousPage']
      },
      CreateModelRequest: {
        type: 'object',
        properties: {
          name: { 
            type: 'string', 
            minLength: 3, 
            maxLength: 100,
            description: 'Function model name'
          },
          description: { 
            type: 'string',
            description: 'Optional model description'
          },
          templateId: { 
            type: 'string', 
            format: 'uuid',
            description: 'Optional template to base the model on'
          }
        },
        required: ['name']
      },
      UpdateModelRequest: {
        type: 'object',
        properties: {
          name: { 
            type: 'string', 
            minLength: 3, 
            maxLength: 100,
            description: 'Function model name'
          },
          description: { 
            type: 'string',
            description: 'Model description'
          },
          metadata: { 
            type: 'object',
            description: 'Additional model metadata'
          }
        }
      },
      PublishModelRequest: {
        type: 'object',
        properties: {
          version: { 
            type: 'string', 
            pattern: '^\\d+\\.\\d+\\.\\d+$',
            description: 'Semantic version (e.g., 1.0.0)'
          },
          publishNotes: { 
            type: 'string',
            description: 'Optional release notes'
          }
        },
        required: ['version']
      },
      AddNodeRequest: {
        type: 'object',
        properties: {
          nodeType: { 
            type: 'string', 
            enum: ['ioNode', 'stageNode'],
            description: 'Type of container node'
          },
          name: { 
            type: 'string', 
            minLength: 1, 
            maxLength: 100,
            description: 'Node name'
          },
          description: { 
            type: 'string',
            description: 'Optional node description'
          },
          position: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' }
            },
            required: ['x', 'y'],
            description: '2D position on canvas'
          },
          metadata: { 
            type: 'object',
            description: 'Additional node metadata'
          },
          typeSpecificData: { 
            type: 'object',
            description: 'Node type-specific configuration'
          }
        },
        required: ['nodeType', 'name', 'position']
      },
      AddActionRequest: {
        type: 'object',
        properties: {
          parentNodeId: { 
            type: 'string', 
            format: 'uuid',
            description: 'ID of the parent container node'
          },
          actionType: { 
            type: 'string', 
            enum: ['tetherNode', 'kbNode', 'functionModelContainer'],
            description: 'Type of action node'
          },
          name: { 
            type: 'string', 
            minLength: 1, 
            maxLength: 100,
            description: 'Action name'
          },
          description: { 
            type: 'string',
            description: 'Optional action description'
          },
          executionMode: { 
            type: 'string', 
            enum: ['sequential', 'parallel', 'conditional'],
            default: 'sequential',
            description: 'Execution mode'
          },
          priority: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 10,
            default: 5,
            description: 'Execution priority (1-10)'
          },
          estimatedDuration: { 
            type: 'number',
            minimum: 0,
            description: 'Estimated duration in minutes'
          },
          metadata: { 
            type: 'object',
            description: 'Additional action metadata'
          },
          actionSpecificData: { 
            type: 'object',
            description: 'Action type-specific configuration'
          }
        },
        required: ['parentNodeId', 'actionType', 'name']
      },
      ModelDto: {
        type: 'object',
        properties: {
          modelId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          version: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          currentVersion: { type: 'string' },
          versionCount: { type: 'integer' },
          metadata: { type: 'object' },
          permissions: {
            type: 'object',
            properties: {
              owner: { type: 'string' },
              editors: { type: 'array', items: { type: 'string' } },
              viewers: { type: 'array', items: { type: 'string' } }
            }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          lastSavedAt: { type: 'string', format: 'date-time' },
          nodes: { type: 'array', items: { $ref: '#/components/schemas/NodeDto' } },
          actionNodes: { type: 'array', items: { $ref: '#/components/schemas/ActionNodeDto' } },
          statistics: { $ref: '#/components/schemas/ModelStatisticsDto' }
        },
        required: ['modelId', 'name', 'version', 'status', 'currentVersion', 'versionCount', 'metadata', 'permissions', 'createdAt', 'updatedAt', 'lastSavedAt']
      },
      NodeDto: {
        type: 'object',
        properties: {
          nodeId: { type: 'string', format: 'uuid' },
          nodeType: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          position: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' }
            }
          },
          dependencies: { type: 'array', items: { type: 'string' } },
          status: { type: 'string' },
          metadata: { type: 'object' },
          visualProperties: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          typeSpecificData: { type: 'object' }
        },
        required: ['nodeId', 'nodeType', 'name', 'position', 'dependencies', 'status', 'metadata', 'visualProperties', 'createdAt', 'updatedAt']
      },
      ActionNodeDto: {
        type: 'object',
        properties: {
          actionId: { type: 'string', format: 'uuid' },
          parentNodeId: { type: 'string', format: 'uuid' },
          actionType: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          executionMode: { type: 'string' },
          executionOrder: { type: 'integer' },
          status: { type: 'string' },
          priority: { type: 'integer' },
          estimatedDuration: { type: 'number' },
          retryPolicy: { type: 'object' },
          raci: { type: 'object' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          actionSpecificData: { type: 'object' }
        },
        required: ['actionId', 'parentNodeId', 'actionType', 'name', 'executionMode', 'executionOrder', 'status', 'priority', 'retryPolicy', 'raci', 'metadata', 'createdAt', 'updatedAt']
      },
      ModelStatisticsDto: {
        type: 'object',
        properties: {
          totalNodes: { type: 'integer' },
          containerNodeCount: { type: 'integer' },
          actionNodeCount: { type: 'integer' },
          nodeTypeBreakdown: { type: 'object' },
          actionTypeBreakdown: { type: 'object' },
          averageComplexity: { type: 'number' },
          maxDependencyDepth: { type: 'integer' },
          executionEstimate: { type: 'number' }
        },
        required: ['totalNodes', 'containerNodeCount', 'actionNodeCount', 'nodeTypeBreakdown', 'actionTypeBreakdown', 'averageComplexity', 'maxDependencyDepth']
      },
      AuditLogDto: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          resourceId: { type: 'string', format: 'uuid' },
          resourceType: { type: 'string' },
          action: { type: 'string' },
          userId: { type: 'string', format: 'uuid' },
          userEmail: { type: 'string', format: 'email' },
          details: { type: 'object' },
          ipAddress: { type: 'string' },
          userAgent: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'resourceId', 'resourceType', 'action', 'userId', 'details', 'createdAt']
      },
      ExecuteWorkflowRequest: {
        type: 'object',
        properties: {
          inputData: {
            type: 'object',
            description: 'Input data for the workflow execution'
          },
          executionContext: {
            type: 'object',
            description: 'Additional context for execution'
          },
          dryRun: {
            type: 'boolean',
            default: false,
            description: 'Run in dry-run mode without executing actions'
          },
          executionMode: {
            type: 'string',
            enum: ['sync', 'async'],
            default: 'async',
            description: 'Execution mode: sync for immediate results, async for background processing'
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            default: 'normal',
            description: 'Execution priority level'
          }
        }
      },
      WorkflowExecutionDto: {
        type: 'object',
        properties: {
          executionId: { type: 'string', format: 'uuid' },
          modelId: { type: 'string', format: 'uuid' },
          status: { 
            type: 'string',
            enum: ['running', 'completed', 'failed', 'dry_run_completed', 'cancelled']
          },
          startedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
          actualDuration: { 
            type: 'number',
            description: 'Actual execution duration in minutes'
          },
          estimatedDuration: { 
            type: 'number',
            description: 'Estimated execution duration in minutes'
          },
          progress: {
            type: 'object',
            properties: {
              totalSteps: { type: 'integer' },
              completedSteps: { type: 'integer' },
              currentStep: { type: 'string' },
              percentage: { type: 'number', minimum: 0, maximum: 100 }
            }
          },
          results: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              outputData: { type: 'object' },
              executionSummary: { type: 'object' }
            }
          },
          inputData: { type: 'object' },
          executionContext: { type: 'object' },
          metadata: { type: 'object' },
          errorDetails: { type: 'object' }
        },
        required: ['executionId', 'modelId', 'status', 'startedAt']
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { enum: [false] },
                    error: {
                      type: 'object',
                      properties: {
                        code: { enum: ['VALIDATION_ERROR'] },
                        message: { type: 'string' },
                        details: { type: 'object' }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { enum: [false] },
                    error: {
                      type: 'object',
                      properties: {
                        code: { enum: ['UNAUTHORIZED'] },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { enum: [false] },
                    error: {
                      type: 'object',
                      properties: {
                        code: { enum: ['FORBIDDEN'] },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      },
      NotFound: {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { enum: [false] },
                    error: {
                      type: 'object',
                      properties: {
                        code: { enum: ['NOT_FOUND'] },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      },
      Conflict: {
        description: 'Conflict',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { enum: [false] },
                    error: {
                      type: 'object',
                      properties: {
                        code: { enum: ['CONFLICT'] },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      },
      TooManyRequests: {
        description: 'Too Many Requests',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { enum: [false] },
                    error: {
                      type: 'object',
                      properties: {
                        code: { enum: ['RATE_LIMITED'] },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      },
      InternalError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/ApiResponse' },
                {
                  type: 'object',
                  properties: {
                    success: { enum: [false] },
                    error: {
                      type: 'object',
                      properties: {
                        code: { enum: ['INTERNAL_ERROR'] },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
};