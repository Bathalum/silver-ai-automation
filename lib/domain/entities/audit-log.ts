import { Result } from '../shared/result';

export interface AuditLogProps {
  auditId: string;
  tableName: string;
  operation: 'create' | 'update' | 'delete';
  recordId: string;
  oldData?: any;
  newData?: any;
  changedBy: string;
  changedAt: Date;
}

export class AuditLog {
  private constructor(private props: AuditLogProps) {}

  public static create(props: Omit<AuditLogProps, 'changedAt'>): Result<AuditLog> {
    const now = new Date();
    const auditProps: AuditLogProps = {
      ...props,
      changedAt: now,
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
    return this.props.tableName;
  }

  public get operation(): 'create' | 'update' | 'delete' {
    return this.props.operation;
  }

  public get recordId(): string {
    return this.props.recordId;
  }

  public get oldData(): any {
    return this.props.oldData;
  }

  public get newData(): any {
    return this.props.newData;
  }

  public get changedBy(): string {
    return this.props.changedBy;
  }

  public get changedAt(): Date {
    return this.props.changedAt;
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

    if (!props.tableName || props.tableName.trim().length === 0) {
      return Result.fail<void>('Table name cannot be empty');
    }

    if (!props.recordId || props.recordId.trim().length === 0) {
      return Result.fail<void>('Record ID cannot be empty');
    }

    if (!props.changedBy || props.changedBy.trim().length === 0) {
      return Result.fail<void>('Changed by user ID cannot be empty');
    }

    if (!['create', 'update', 'delete'].includes(props.operation)) {
      return Result.fail<void>('Operation must be create, update, or delete');
    }

    // Validate operation-specific requirements
    if (props.operation === 'create' && !props.newData) {
      return Result.fail<void>('Create operation must have new data');
    }

    if (props.operation === 'delete' && !props.oldData) {
      return Result.fail<void>('Delete operation must have old data');
    }

    if (props.operation === 'update' && !props.oldData && !props.newData) {
      return Result.fail<void>('Update operation must have old data or new data');
    }

    return Result.ok<void>(undefined);
  }
}