import { Result } from '../../domain/shared/result';
import { IFunctionModelRepository } from '../../domain/interfaces/function-model-repository';
import { NodeDto } from '../function-model/manage-workflow-nodes-use-case';

export interface GetModelNodesQuery {
  modelId: string;
  includeMetadata?: boolean;
  includeArchived?: boolean;
}

export interface GetModelNodesResult {
  nodes: NodeDto[];
  totalCount: number;
  modelId: string;
  modelName: string;
}

/**
 * GetModelNodesQueryHandler
 * 
 * Application layer query handler for retrieving workflow nodes for a specific model.
 * Used by the workflow designer to load existing nodes.
 * 
 * Dependencies: Repository Interface (inward dependency)
 */
export class GetModelNodesQueryHandler {
  constructor(
    private modelRepository: IFunctionModelRepository
  ) {}

  /**
   * Handle query to get all nodes for a specific model
   */
  async handle(query: GetModelNodesQuery): Promise<Result<GetModelNodesResult>> {
    try {
      // Validate query
      const validationResult = this.validateQuery(query);
      if (validationResult.isFailure) {
        return Result.fail<GetModelNodesResult>(validationResult.error);
      }

      // Get model with nodes
      const modelResult = await this.modelRepository.findById(query.modelId);
      if (modelResult.isFailure) {
        return Result.fail<GetModelNodesResult>(modelResult.error);
      }

      if (!modelResult.value) {
        return Result.fail<GetModelNodesResult>('Function model not found');
      }

      const model = modelResult.value;

      // Convert domain nodes to DTOs
      const nodeDtos: NodeDto[] = [];
      
      for (const node of model.nodes.values()) {
        // Skip archived nodes unless explicitly requested
        if (!query.includeArchived && node.status === 'archived') {
          continue;
        }

        // Get original React Flow node type from metadata, or infer from domain type
        const originalNodeType = node.metadata?.nodeType || this.inferReactFlowNodeType(node);
        
        const nodeDto: NodeDto = {
          id: typeof node.nodeId === 'string' ? node.nodeId : node.nodeId.toString(),
          type: originalNodeType,
          position: {
            x: node.position.x,
            y: node.position.y
          },
          data: {
            label: typeof node.name === 'string' ? node.name : node.name.value || 'Unnamed Node',
            description: node.description,
            status: node.status,
            metadata: query.includeMetadata ? node.metadata : undefined,
            // Add type-specific data
            ...this.getTypeSpecificData(node)
          }
        };

        nodeDtos.push(nodeDto);
      }

      // Sort nodes by creation order for consistent rendering
      nodeDtos.sort((a, b) => {
        const aCreated = a.data.metadata?.createdAt || '0';
        const bCreated = b.data.metadata?.createdAt || '0';
        return aCreated.localeCompare(bCreated);
      });

      const result: GetModelNodesResult = {
        nodes: nodeDtos,
        totalCount: nodeDtos.length,
        modelId: model.modelId,
        modelName: model.name.value
      };

      return Result.ok<GetModelNodesResult>(result);

    } catch (error) {
      return Result.fail<GetModelNodesResult>(
        `Failed to get model nodes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get nodes with additional filtering options
   */
  async handleWithFilters(
    query: GetModelNodesQuery, 
    filters: {
      nodeTypes?: string[];
      status?: string[];
      searchTerm?: string;
    } = {}
  ): Promise<Result<GetModelNodesResult>> {
    try {
      // Get all nodes first
      const baseResult = await this.handle(query);
      if (baseResult.isFailure) {
        return baseResult;
      }

      let filteredNodes = baseResult.value.nodes;

      // Apply node type filter
      if (filters.nodeTypes && filters.nodeTypes.length > 0) {
        filteredNodes = filteredNodes.filter(node => 
          filters.nodeTypes!.includes(node.type)
        );
      }

      // Apply status filter
      if (filters.status && filters.status.length > 0) {
        filteredNodes = filteredNodes.filter(node => 
          filters.status!.includes(node.data.status)
        );
      }

      // Apply search term filter (search in name and description)
      if (filters.searchTerm && filters.searchTerm.trim().length > 0) {
        const searchTerm = filters.searchTerm.toLowerCase().trim();
        filteredNodes = filteredNodes.filter(node => 
          node.data.label.toLowerCase().includes(searchTerm) ||
          (node.data.description && node.data.description.toLowerCase().includes(searchTerm))
        );
      }

      const result: GetModelNodesResult = {
        ...baseResult.value,
        nodes: filteredNodes,
        totalCount: filteredNodes.length
      };

      return Result.ok<GetModelNodesResult>(result);

    } catch (error) {
      return Result.fail<GetModelNodesResult>(
        `Failed to get filtered model nodes: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Private helper methods

  private inferReactFlowNodeType(node: any): string {
    // For unified nodes, use the getNodeType method
    if (node.getNodeType && typeof node.getNodeType === 'function') {
      const nodeType = node.getNodeType();
      
      // Map domain NodeType enum to React Flow node types
      switch (nodeType) {
        case 'ioNode':
          return 'ioNode';
        case 'stageNode': 
          return 'stageNode';
        case 'tetherNode':
          return 'tetherNode';
        case 'kbNode':
          return 'kbNode';
        case 'functionModelContainer':
          return 'functionModelContainer';
        default:
          console.warn('Unknown unified node type:', nodeType);
          return 'default';
      }
    }
    
    // Legacy fallback for old constructor-based detection
    if (node.constructor.name === 'IONode') {
      return 'ioNode';
    } else if (node.constructor.name === 'StageNode') {
      return 'stageNode';
    }
    
    return 'default';
  }

  private getTypeSpecificData(node: any): Record<string, any> {
    // Extract type-specific data based on node type
    const typeData: Record<string, any> = {};

    // For unified nodes, extract type-specific data directly from properties
    if (node.getNodeType && typeof node.getNodeType === 'function') {
      const nodeType = node.getNodeType();
      
      switch (nodeType) {
        case 'ioNode':
          if (node.ioData) {
            typeData.ioData = node.ioData;
          }
          break;
        case 'stageNode':
          if (node.stageData) {
            typeData.stageData = node.stageData;
          }
          break;
        case 'tetherNode':
          if (node.tetherData) {
            typeData.tetherData = node.tetherData;
          }
          break;
        case 'kbNode':
          if (node.kbData) {
            typeData.kbData = node.kbData;
          }
          break;
        case 'functionModelContainer':
          if (node.containerData) {
            typeData.containerData = node.containerData;
          }
          break;
      }
    } else {
      // Legacy fallback for old constructor-based nodes
      if (node.constructor.name === 'IONode' && (node as any).ioData) {
        typeData.ioData = (node as any).ioData;
      }

      if (node.constructor.name === 'StageNode' && (node as any).stageData) {
        typeData.stageData = (node as any).stageData;
      }
    }

    // Add visual properties if they exist
    if (node.visualProperties) {
      typeData.visualProperties = node.visualProperties;
    }

    return typeData;
  }

  private validateQuery(query: GetModelNodesQuery): Result<void> {
    if (!query.modelId || query.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID is required');
    }

    // UUID format validation - relaxed for development
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // In development, allow any non-empty string; in production, enforce UUID format
    if (!isDevelopment && !uuidRegex.test(query.modelId)) {
      return Result.fail<void>('Model ID must be a valid UUID');
    }

    return Result.ok<void>(undefined);
  }
}