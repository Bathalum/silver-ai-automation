import { ModelStatus } from '../../domain/enums';

export interface GetFunctionModelQuery {
  modelId: string;
  userId: string;
  includeNodes?: boolean;
  includeActionNodes?: boolean;
}

export interface ListFunctionModelsQuery {
  userId: string;
  organizationId?: string;
  status?: ModelStatus[];
  searchTerm?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'created_at' | 'updated_at' | 'last_saved_at';
  sortOrder?: 'asc' | 'desc';
}

export interface GetModelVersionsQuery {
  modelId: string;
  userId: string;
  limit?: number;
  offset?: number;
}

export interface GetModelStatisticsQuery {
  modelId: string;
  userId: string;
}

export interface SearchModelsQuery {
  userId: string;
  searchTerm: string;
  searchIn?: ('name' | 'description' | 'metadata')[];
  filters?: {
    status?: ModelStatus[];
    tags?: string[];
    createdBy?: string;
    organizationId?: string;
  };
  limit?: number;
  offset?: number;
}

export interface GetModelPermissionsQuery {
  modelId: string;
  userId: string;
}

export interface GetModelAuditLogQuery {
  modelId: string;
  userId: string;
  fromDate?: Date;
  toDate?: Date;
  operations?: string[];
  limit?: number;
  offset?: number;
}