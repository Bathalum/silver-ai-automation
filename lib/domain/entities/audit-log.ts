import { Result } from '../shared/result';

export interface AuditLogProps {
  auditId: string;
  tableName?: string;  // Keep for backwards compatibility
  operation?: 'create' | 'update' | 'delete';  // Keep for backwards compatibility
  recordId?: string;  // Keep for backwards compatibility
  oldData?: any;
  newData?: any;
  changedBy?: string;  // Keep for backwards compatibility
  changedAt?: Date;  // Keep for backwards compatibility
  // New enhanced interface
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  timestamp?: Date;
  details?: any;
}

export class AuditLog {
  private constructor(private props: AuditLogProps) {}

  public static create(props: Omit<AuditLogProps, 'changedAt'> & Partial<Pick<AuditLogProps, 'timestamp'>>): Result<AuditLog> {
    const now = new Date();
    const auditProps: AuditLogProps = {
      ...props,
      changedAt: now,
      timestamp: props.timestamp || now,
    };

    const validationResult = AuditLog.validate(auditProps);
    if (validationResult.isFailure) {
      return Result.fail<AuditLog>(validationResult.error);
    }

    return Result.ok<AuditLog>(new AuditLog(auditProps));
  }

  public get auditId(): string {
    return this.props.auditId;
  }

  public get tableName(): string {
    return this.props.tableName || this.props.entityType || '';
  }

  public get operation(): string {
    return this.props.operation || this.props.action || '';
  }

  public get recordId(): string {
    return this.props.recordId || this.props.entityId || '';
  }

  public get oldData(): any {
    return this.props.oldData;
  }

  public get newData(): any {
    return this.props.newData;
  }

  public get changedBy(): string {
    return this.props.changedBy || this.props.userId || '';
  }

  public get changedAt(): Date {
    return this.props.changedAt || this.props.timestamp || new Date();
  }

  // New enhanced interface getters
  public get entityType(): string {
    return this.props.entityType || this.props.tableName || '';
  }

  public get entityId(): string {
    return this.props.entityId || this.props.recordId || '';
  }

  public get action(): string {
    return this.props.action || this.props.operation || '';
  }

  public get userId(): string {
    return this.props.userId || this.props.changedBy || '';
  }

  public get timestamp(): Date {
    return this.props.timestamp || this.props.changedAt || new Date();
  }

  public get details(): any {
    return this.props.details;
  }

  public hasDataChange(): boolean {
    return this.props.oldData !== undefined || this.props.newData !== undefined;
  }

  public isCreateOperation(): boolean {
    return this.props.operation === 'create';
  }

  public isUpdateOperation(): boolean {
    return this.props.operation === 'update';
  }

  public isDeleteOperation(): boolean {
    return this.props.operation === 'delete';
  }

  public getChangedFields(): string[] {
    if (!this.isUpdateOperation() || !this.props.oldData || !this.props.newData) {
      return [];
    }

    const changedFields: string[] = [];
    const oldKeys = Object.keys(this.props.oldData);
    const newKeys = Object.keys(this.props.newData);
    const allKeys = Array.from(new Set([...oldKeys, ...newKeys]));

    for (const key of allKeys) {
      const oldValue = this.props.oldData[key];
      const newValue = this.props.newData[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  public equals(other: AuditLog): boolean {
    return this.auditId === other.auditId;
  }

  private static validate(props: AuditLogProps): Result<void> {
    if (!props.auditId || props.auditId.trim().length === 0) {
      return Result.fail<void>('Audit ID cannot be empty');
    }

    // Validate using the new interface if present, otherwise use legacy
    const tableName = props.entityType || props.tableName;
    const recordId = props.entityId || props.recordId;
    const changedBy = props.userId || props.changedBy;
    const operation = props.action || props.operation;

    if (!tableName || tableName.trim().length === 0) {
      return Result.fail<void>('Table name cannot be empty');
    }

    if (!recordId || recordId.trim().length === 0) {
      return Result.fail<void>('Record ID cannot be empty');
    }

    if (!changedBy || changedBy.trim().length === 0) {
      return Result.fail<void>('Changed by user ID cannot be empty');
    }

    // Skip operation validation for new enhanced interface - it uses flexible actions
    if (props.operation && !['create', 'update', 'delete'].includes(props.operation)) {
      return Result.fail<void>('Operation must be create, update, or delete');
    }

    // Validate operation-specific requirements only for legacy interface
    if (props.operation) {
      if (props.operation === 'create' && !props.newData) {
        return Result.fail<void>('Create operation must have new data');
      }

      if (props.operation === 'delete' && !props.oldData) {
        return Result.fail<void>('Delete operation must have old data');
      }

      if (props.operation === 'update' && !props.oldData && !props.newData) {
        return Result.fail<void>('Update operation must have old data or new data');
      }
    }

    return Result.ok<void>(undefined);
  }
}