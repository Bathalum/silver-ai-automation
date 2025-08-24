export interface CreateModelCommand {
  name: string;
  description?: string;
  templateId?: string;
  userId: string;
  organizationId?: string;
}

export interface UpdateModelCommand {
  modelId: string;
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
  userId: string;
}

export interface PublishModelCommand {
  modelId: string;
  version: string;
  userId: string;
  publishNotes?: string;
}

export interface ArchiveModelCommand {
  modelId: string;
  userId: string;
  archiveReason?: string;
}

export interface DeleteModelCommand {
  modelId: string;
  userId: string;
  deleteReason?: string;
}

export interface DuplicateModelCommand {
  sourceModelId: string;
  newName: string;
  userId: string;
  includeActionNodes?: boolean;
}

export interface CreateVersionCommand {
  modelId: string;
  versionType: 'major' | 'minor' | 'patch';
  userId: string;
  versionNotes?: string;
}