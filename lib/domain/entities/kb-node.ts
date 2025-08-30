import { ActionNode, ActionNodeProps } from './action-node';
import { ActionNodeType, ExecutionMode, ActionStatus } from '../enums';
import { Result } from '../shared/result';
import { NodeId } from '../value-objects/node-id';
import { RetryPolicy } from '../value-objects/retry-policy';
import { RACI } from '../value-objects/raci';

export interface KBNodeData {
  kbReferenceId: string;
  shortDescription: string;
  documentationContext?: string;
  searchKeywords: string[];
  accessPermissions: {
    view: string[];
    edit: string[];
  };
}

export interface KBNodeProps extends ActionNodeProps {
  actionType: string;
  configuration?: KBNodeData;
}

export interface KBNodeCreateProps {
  actionId: string;
  parentNodeId: string;
  modelId: string;
  name: string;
  description?: string;
  executionMode: ExecutionMode;
  executionOrder: number;
  status: ActionStatus;
  priority: number;
  estimatedDuration?: number;
  retryPolicy: any;
  raci: any;
  metadata: any;
  kbData: KBNodeData;
}

export class KBNode extends ActionNode {
  protected declare props: KBNodeProps;

  private constructor(props: KBNodeProps) {
    super(props);
  }

  public static create(createProps: KBNodeCreateProps): Result<KBNode> {
    const now = new Date();

    // Validate KB data
    const validationResult = KBNode.validateKBData(createProps.kbData);
    if (validationResult.isFailure) {
      return Result.fail<KBNode>(validationResult.error);
    }

    const actionNodeProps: ActionNodeProps = {
      actionId: NodeId.create(createProps.actionId).value,
      parentNodeId: NodeId.create(createProps.parentNodeId).value,
      modelId: createProps.modelId,
      name: createProps.name,
      description: createProps.description,
      executionMode: createProps.executionMode,
      executionOrder: createProps.executionOrder,
      status: createProps.status,
      priority: createProps.priority,
      estimatedDuration: createProps.estimatedDuration || 0,
      retryPolicy: createProps.retryPolicy,
      raci: createProps.raci,
      metadata: createProps.metadata,
      createdAt: now,
      updatedAt: now,
    };

    const nodeProps: KBNodeProps = {
      ...actionNodeProps,
      actionType: ActionNodeType.KB_NODE,
      configuration: createProps.kbData,
    };

    return Result.ok<KBNode>(new KBNode(nodeProps));
  }

  public get kbData(): Readonly<KBNodeData> {
    return this.props.configuration!;
  }

  public get actionType(): string {
    return this.props.actionType;
  }

  public getActionType(): string {
    return this.props.actionType;
  }

  public updateKBReferenceId(referenceId: string): Result<void> {
    const trimmed = referenceId.trim();
    if (!trimmed) {
      return Result.fail<void>('KB reference ID cannot be empty');
    }

    this.props.configuration!.kbReferenceId = trimmed;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateShortDescription(description: string): Result<void> {
    const trimmed = description.trim();
    if (!trimmed) {
      return Result.fail<void>('Short description cannot be empty');
    }
    if (trimmed.length > 500) {
      return Result.fail<void>('Short description cannot exceed 500 characters');
    }

    this.props.configuration!.shortDescription = trimmed;
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateDocumentationContext(context?: string): Result<void> {
    if (context !== undefined) {
      const trimmed = context.trim();
      if (trimmed.length > 2000) {
        return Result.fail<void>('Documentation context cannot exceed 2000 characters');
      }
      this.props.configuration!.documentationContext = trimmed || '';
    } else {
      this.props.configuration!.documentationContext = undefined;
    }
    
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addSearchKeyword(keyword: string): Result<void> {
    const trimmed = keyword.trim().toLowerCase();
    if (!trimmed) {
      return Result.fail<void>('Search keyword cannot be empty');
    }

    const keywords = this.props.configuration!.searchKeywords;
    if (keywords.includes(trimmed)) {
      return Result.fail<void>('Search keyword already exists');
    }
    if (keywords.length >= 20) {
      return Result.fail<void>('Cannot have more than 20 search keywords');
    }

    keywords.push(trimmed);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeSearchKeyword(keyword: string): Result<void> {
    const trimmed = keyword.trim().toLowerCase();
    const keywords = this.props.configuration!.searchKeywords;
    const index = keywords.indexOf(trimmed);
    
    if (index === -1) {
      return Result.fail<void>('Search keyword does not exist');
    }

    keywords.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateAccessPermissions(permissions: { view: string[]; edit: string[] }): Result<void> {
    // Clean up permissions
    const cleanView = Array.from(new Set(permissions.view.filter(u => u.trim())));
    const cleanEdit = Array.from(new Set(permissions.edit.filter(u => u.trim())));

    // Validate that edit users have view permissions
    const missingViewPermissions = cleanEdit.filter(user => !cleanView.includes(user));
    if (missingViewPermissions.length > 0) {
      return Result.fail<void>('Users with edit permissions must also have view permissions');
    }

    this.props.configuration!.accessPermissions = {
      view: cleanView,
      edit: cleanEdit
    };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public grantViewAccess(userId: string): Result<void> {
    const trimmed = userId.trim();
    if (!trimmed) {
      return Result.fail<void>('User ID cannot be empty');
    }

    const permissions = this.props.configuration!.accessPermissions;
    if (permissions.view.includes(trimmed)) {
      return Result.fail<void>('User already has view access');
    }

    permissions.view.push(trimmed);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public grantEditAccess(userId: string): Result<void> {
    const trimmed = userId.trim();
    if (!trimmed) {
      return Result.fail<void>('User ID cannot be empty');
    }

    const permissions = this.props.configuration!.accessPermissions;
    if (permissions.edit.includes(trimmed)) {
      return Result.fail<void>('User already has edit access');
    }

    // Auto-grant view access if needed
    if (!permissions.view.includes(trimmed)) {
      permissions.view.push(trimmed);
    }

    permissions.edit.push(trimmed);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public revokeAccess(userId: string): Result<void> {
    const trimmed = userId.trim();
    if (!trimmed) {
      return Result.fail<void>('User ID cannot be empty');
    }

    const permissions = this.props.configuration!.accessPermissions;
    const hasViewAccess = permissions.view.includes(trimmed);
    const hasEditAccess = permissions.edit.includes(trimmed);

    if (!hasViewAccess && !hasEditAccess) {
      return Result.fail<void>('User does not have access');
    }

    // Remove from both arrays
    permissions.view = permissions.view.filter(u => u !== trimmed);
    permissions.edit = permissions.edit.filter(u => u !== trimmed);
    
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  private static validateKBData(kbData: KBNodeData): Result<void> {
    // Validate KB reference ID
    if (!kbData.kbReferenceId || kbData.kbReferenceId.trim().length === 0) {
      return Result.fail<void>('KB reference ID is required');
    }

    // Validate short description
    if (!kbData.shortDescription || kbData.shortDescription.trim().length === 0) {
      return Result.fail<void>('Short description is required');
    }
    if (kbData.shortDescription.length > 500) {
      return Result.fail<void>('Short description cannot exceed 500 characters');
    }

    // Validate documentation context if provided
    if (kbData.documentationContext && kbData.documentationContext.length > 2000) {
      return Result.fail<void>('Documentation context cannot exceed 2000 characters');
    }

    // Validate search keywords
    if (kbData.searchKeywords.length > 20) {
      return Result.fail<void>('Cannot have more than 20 search keywords');
    }

    // Validate access permissions
    const missingViewPermissions = kbData.accessPermissions.edit.filter(user => 
      !kbData.accessPermissions.view.includes(user)
    );
    if (missingViewPermissions.length > 0) {
      return Result.fail<void>('Users with edit permissions must also have view permissions');
    }

    return Result.ok<void>(undefined);
  }
}