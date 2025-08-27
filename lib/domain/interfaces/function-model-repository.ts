import { Result } from '../shared/result';
import { FunctionModel } from '../entities/function-model';
import { ModelStatus } from '../enums';

export interface IFunctionModelRepository {
  save(model: FunctionModel): Promise<Result<void>>;
  findById(id: string): Promise<Result<FunctionModel>>;
  findByName(name: string): Promise<Result<FunctionModel[]>>;
  findByStatus(status: ModelStatus[]): Promise<Result<FunctionModel[]>>;
  findAll(): Promise<Result<FunctionModel[]>>;
  delete(id: string): Promise<Result<void>>;
  exists(id: string): Promise<Result<boolean>>;
  findByOwner(ownerId: string): Promise<Result<FunctionModel[]>>;
  publishModel(id: string): Promise<Result<void>>;
  archiveModel(id: string): Promise<Result<void>>;
  findByNamePattern(pattern: string): Promise<Result<FunctionModel[]>>;
  findRecentlyModified(limit: number): Promise<Result<FunctionModel[]>>;
  countByStatus(status: ModelStatus): Promise<Result<number>>;
  softDelete(id: string, deletedBy: string): Promise<Result<void>>;
  restore(id: string): Promise<Result<void>>;
  findDeleted(): Promise<Result<FunctionModel[]>>;
  findPublishedVersions(): Promise<Result<FunctionModel[]>>;
  findDraftVersions(): Promise<Result<FunctionModel[]>>;
}

// Keep backwards compatibility
export interface FunctionModelRepository extends IFunctionModelRepository {}