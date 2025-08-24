import { Result } from '../shared/result';

export interface FunctionModelVersionProps {
  versionId: string;
  modelId: string;
  versionNumber: string;
  versionData: any;
  authorId: string;
  isPublished: boolean;
  createdAt: Date;
}

export class FunctionModelVersion {
  private constructor(private props: FunctionModelVersionProps) {}

  public static create(props: Omit<FunctionModelVersionProps, 'createdAt'>): Result<FunctionModelVersion> {
    const now = new Date();
    const versionProps: FunctionModelVersionProps = {
      ...props,
      createdAt: now,
    };

    const validationResult = FunctionModelVersion.validate(versionProps);
    if (validationResult.isFailure) {
      return Result.fail<FunctionModelVersion>(validationResult.error);
    }

    return Result.ok<FunctionModelVersion>(new FunctionModelVersion(versionProps));
  }

  public get versionId(): string {
    return this.props.versionId;
  }

  public get modelId(): string {
    return this.props.modelId;
  }

  public get versionNumber(): string {
    return this.props.versionNumber;
  }

  public get versionData(): any {
    return this.props.versionData;
  }

  public get authorId(): string {
    return this.props.authorId;
  }

  public get isPublished(): boolean {
    return this.props.isPublished;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public publish(): Result<void> {
    if (this.props.isPublished) {
      return Result.fail<void>('Version is already published');
    }

    this.props.isPublished = true;
    return Result.ok<void>(undefined);
  }

  public unpublish(): Result<void> {
    if (!this.props.isPublished) {
      return Result.fail<void>('Version is not published');
    }

    this.props.isPublished = false;
    return Result.ok<void>(undefined);
  }

  public equals(other: FunctionModelVersion): boolean {
    return this.versionId === other.versionId;
  }

  private static validate(props: FunctionModelVersionProps): Result<void> {
    if (!props.versionId || props.versionId.trim().length === 0) {
      return Result.fail<void>('Version ID cannot be empty');
    }

    if (!props.modelId || props.modelId.trim().length === 0) {
      return Result.fail<void>('Model ID cannot be empty');
    }

    if (!props.versionNumber || props.versionNumber.trim().length === 0) {
      return Result.fail<void>('Version number cannot be empty');
    }

    if (!props.authorId || props.authorId.trim().length === 0) {
      return Result.fail<void>('Author ID cannot be empty');
    }

    if (!props.versionData) {
      return Result.fail<void>('Version data cannot be empty');
    }

    // Validate semantic versioning format (x.y.z)
    const versionPattern = /^\d+\.\d+\.\d+$/;
    if (!versionPattern.test(props.versionNumber)) {
      return Result.fail<void>('Version number must follow semantic versioning format (x.y.z)');
    }

    return Result.ok<void>(undefined);
  }
}