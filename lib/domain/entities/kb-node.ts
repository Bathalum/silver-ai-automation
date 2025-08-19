import { ActionNode, ActionNodeProps } from './action-node';
import { ActionNodeType } from '../enums';
import { Result } from '../shared/result';

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
  kbData: KBNodeData;
}

export class KBNode extends ActionNode {
  protected declare props: KBNodeProps;

  private constructor(props: KBNodeProps) {
    super(props);
  }

  public static create(props: Omit<KBNodeProps, 'createdAt' | 'updatedAt'>): Result<KBNode> {
    const now = new Date();
    const nodeProps: KBNodeProps = {
      ...props,
      createdAt: now,
      updatedAt: now,
    };

    // Validate KB-specific business rules
    const validationResult = KBNode.validateKBData(props.kbData);
    if (validationResult.isFailure) {
      return Result.fail<KBNode>(validationResult.error);
    }

    return Result.ok<KBNode>(new KBNode(nodeProps));
  }

  public get kbData(): Readonly<KBNodeData> {
    return this.props.kbData;
  }

  public getActionType(): string {
    return ActionNodeType.KB_NODE;
  }

  public updateKBReferenceId(referenceId: string): Result<void> {
    if (!referenceId || referenceId.trim().length === 0) {
      return Result.fail<void>('KB reference ID cannot be empty');
    }

    this.props.kbData.kbReferenceId = referenceId.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateShortDescription(description: string): Result<void> {
    if (!description || description.trim().length === 0) {
      return Result.fail<void>('Short description cannot be empty');
    }

    if (description.trim().length > 500) {
      return Result.fail<void>('Short description cannot exceed 500 characters');
    }

    this.props.kbData.shortDescription = description.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateDocumentationContext(context?: string): Result<void> {
    if (context && context.length > 2000) {
      return Result.fail<void>('Documentation context cannot exceed 2000 characters');
    }

    this.props.kbData.documentationContext = context?.trim();
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public addSearchKeyword(keyword: string): Result<void> {
    if (!keyword || keyword.trim().length === 0) {
      return Result.fail<void>('Search keyword cannot be empty');
    }

    const trimmedKeyword = keyword.trim().toLowerCase();
    if (this.props.kbData.searchKeywords.includes(trimmedKeyword)) {
      return Result.fail<void>('Search keyword already exists');
    }

    if (this.props.kbData.searchKeywords.length >= 20) {
      return Result.fail<void>('Cannot have more than 20 search keywords');
    }

    this.props.kbData.searchKeywords.push(trimmedKeyword);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public removeSearchKeyword(keyword: string): Result<void> {
    const index = this.props.kbData.searchKeywords.indexOf(keyword.trim().toLowerCase());
    if (index === -1) {
      return Result.fail<void>('Search keyword does not exist');
    }

    this.props.kbData.searchKeywords.splice(index, 1);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public updateAccessPermissions(permissions: {
    view: string[];
    edit: string[];
  }): Result<void> {
    // Validate that all users in edit permissions are also in view permissions
    const missingViewPermissions = permissions.edit.filter(user => 
      !permissions.view.includes(user)
    );

    if (missingViewPermissions.length > 0) {
      return Result.fail<void>('Users with edit permissions must also have view permissions');
    }

    // Remove duplicates and empty strings
    const cleanViewPermissions = Array.from(new Set(permissions.view.filter(user => user && user.trim().length > 0)));
    const cleanEditPermissions = Array.from(new Set(permissions.edit.filter(user => user && user.trim().length > 0)));

    this.props.kbData.accessPermissions = {
      view: cleanViewPermissions,
      edit: cleanEditPermissions,
    };
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public grantViewAccess(userId: string): Result<void> {
    if (!userId || userId.trim().length === 0) {
      return Result.fail<void>('User ID cannot be empty');
    }

    const trimmedUserId = userId.trim();
    if (this.props.kbData.accessPermissions.view.includes(trimmedUserId)) {
      return Result.fail<void>('User already has view access');
    }

    this.props.kbData.accessPermissions.view.push(trimmedUserId);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public grantEditAccess(userId: string): Result<void> {
    if (!userId || userId.trim().length === 0) {
      return Result.fail<void>('User ID cannot be empty');
    }

    const trimmedUserId = userId.trim();
    
    // Ensure user has view access first
    if (!this.props.kbData.accessPermissions.view.includes(trimmedUserId)) {
      this.props.kbData.accessPermissions.view.push(trimmedUserId);
    }

    if (this.props.kbData.accessPermissions.edit.includes(trimmedUserId)) {
      return Result.fail<void>('User already has edit access');
    }

    this.props.kbData.accessPermissions.edit.push(trimmedUserId);
    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  public revokeAccess(userId: string): Result<void> {
    if (!userId || userId.trim().length === 0) {
      return Result.fail<void>('User ID cannot be empty');
    }

    const trimmedUserId = userId.trim();
    
    // Remove from both view and edit permissions
    const viewIndex = this.props.kbData.accessPermissions.view.indexOf(trimmedUserId);
    if (viewIndex !== -1) {
      this.props.kbData.accessPermissions.view.splice(viewIndex, 1);
    }

    const editIndex = this.props.kbData.accessPermissions.edit.indexOf(trimmedUserId);
    if (editIndex !== -1) {
      this.props.kbData.accessPermissions.edit.splice(editIndex, 1);
    }

    if (viewIndex === -1 && editIndex === -1) {
      return Result.fail<void>('User does not have access');
    }

    this.props.updatedAt = new Date();
    return Result.ok<void>(undefined);
  }

  private static validateKBData(kbData: KBNodeData): Result<void> {
    if (!kbData.kbReferenceId || kbData.kbReferenceId.trim().length === 0) {
      return Result.fail<void>('KB reference ID is required');
    }

    if (!kbData.shortDescription || kbData.shortDescription.trim().length === 0) {
      return Result.fail<void>('Short description is required');
    }

    if (kbData.shortDescription.length > 500) {
      return Result.fail<void>('Short description cannot exceed 500 characters');
    }

    if (kbData.documentationContext && kbData.documentationContext.length > 2000) {
      return Result.fail<void>('Documentation context cannot exceed 2000 characters');
    }

    if (kbData.searchKeywords.length > 20) {
      return Result.fail<void>('Cannot have more than 20 search keywords');
    }

    // Validate access permissions
    const { accessPermissions } = kbData;
    const missingViewPermissions = accessPermissions.edit.filter(user => 
      !accessPermissions.view.includes(user)
    );

    if (missingViewPermissions.length > 0) {
      return Result.fail<void>('Users with edit permissions must also have view permissions');
    }

    return Result.ok<void>(undefined);
  }
}