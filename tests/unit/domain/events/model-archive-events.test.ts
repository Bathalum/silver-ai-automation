import { ModelArchived, ModelArchivedData } from '../../../../lib/domain/events/model-events';
import { ModelStatus } from '../../../../lib/domain/enums';

describe('ModelArchived Event - Archive Audit Trail', () => {
  describe('Event Creation - Data Pattern', () => {
    it('should create ModelArchived event with complete data object', () => {
      // Arrange
      const eventData: ModelArchivedData = {
        modelId: 'test-model-123',
        modelName: 'Archive Test Model',
        version: '1.2.0',
        archivedBy: 'test-user-456',
        archivedAt: new Date('2024-03-15T10:30:00Z'),
        previousStatus: ModelStatus.PUBLISHED,
        currentStatus: ModelStatus.ARCHIVED,
        reason: 'End of lifecycle - superseded by v2.0'
      };

      // Act
      const event = new ModelArchived(eventData);

      // Assert
      expect(event.aggregateId).toBe('test-model-123');
      expect(event.modelName).toBe('Archive Test Model');
      expect(event.version).toBe('1.2.0');
      expect(event.archivedBy).toBe('test-user-456');
      expect(event.archivedAt).toEqual(new Date('2024-03-15T10:30:00Z'));
      expect(event.previousStatus).toBe(ModelStatus.PUBLISHED);
      expect(event.currentStatus).toBe(ModelStatus.ARCHIVED);
      expect(event.reason).toBe('End of lifecycle - superseded by v2.0');
      expect(event.eventVersion).toBe(1);
    });

    it('should create ModelArchived event with minimal required data', () => {
      // Arrange
      const eventData: ModelArchivedData = {
        modelId: 'test-model-456',
        modelName: 'Minimal Archive Model',
        version: '0.1.0',
        archivedBy: 'system-admin',
        archivedAt: new Date(),
        previousStatus: ModelStatus.DRAFT,
        currentStatus: ModelStatus.ARCHIVED
      };

      // Act
      const event = new ModelArchived(eventData);

      // Assert
      expect(event.aggregateId).toBe('test-model-456');
      expect(event.modelName).toBe('Minimal Archive Model');
      expect(event.version).toBe('0.1.0');
      expect(event.archivedBy).toBe('system-admin');
      expect(event.archivedAt).toBeInstanceOf(Date);
      expect(event.previousStatus).toBe(ModelStatus.DRAFT);
      expect(event.currentStatus).toBe(ModelStatus.ARCHIVED);
      expect(event.reason).toBeUndefined();
    });
  });

  describe('Event Creation - Individual Parameters Pattern', () => {
    it('should create ModelArchived event with individual parameters', () => {
      // Act
      const event = new ModelArchived(
        'individual-param-model',
        ModelStatus.PUBLISHED,
        'archive-user',
        'Regulatory compliance requirement'
      );

      // Assert
      expect(event.aggregateId).toBe('individual-param-model');
      expect(event.previousStatus).toBe(ModelStatus.PUBLISHED);
      expect(event.currentStatus).toBe(ModelStatus.ARCHIVED);
      expect(event.archivedBy).toBe('archive-user');
      expect(event.archivedAt).toBeInstanceOf(Date);
      expect(event.reason).toBe('Regulatory compliance requirement');
      expect(event.eventVersion).toBe(1);
    });

    it('should create ModelArchived event without optional reason', () => {
      // Act
      const event = new ModelArchived(
        'no-reason-model',
        ModelStatus.DRAFT,
        'cleanup-user'
      );

      // Assert
      expect(event.aggregateId).toBe('no-reason-model');
      expect(event.previousStatus).toBe(ModelStatus.DRAFT);
      expect(event.currentStatus).toBe(ModelStatus.ARCHIVED);
      expect(event.archivedBy).toBe('cleanup-user');
      expect(event.archivedAt).toBeInstanceOf(Date);
      expect(event.reason).toBeUndefined();
    });

    it('should fail to create event with missing required parameters', () => {
      // Act & Assert
      expect(() => {
        new ModelArchived('missing-params-model', ModelStatus.PUBLISHED);
      }).toThrow('Individual parameters constructor requires modelId, previousStatus, and archivedBy');
    });

    it('should fail to create event with undefined previousStatus', () => {
      // Act & Assert
      expect(() => {
        new ModelArchived('undefined-status-model', undefined as any, 'test-user');
      }).toThrow('Individual parameters constructor requires modelId, previousStatus, and archivedBy');
    });
  });

  describe('Event Name and Type', () => {
    it('should return correct event name', () => {
      // Arrange
      const event = new ModelArchived('test-model', ModelStatus.PUBLISHED, 'test-user');

      // Act & Assert
      expect(event.getEventName()).toBe('ModelArchived');
    });

    it('should be properly typed as domain event', () => {
      // Arrange
      const event = new ModelArchived('test-model', ModelStatus.DRAFT, 'test-user');

      // Assert
      expect(event.aggregateId).toBe('test-model');
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.eventVersion).toBe(1);
    });
  });

  describe('Event Serialization - Audit Trail Requirements', () => {
    it('should serialize event data with all audit fields', () => {
      // Arrange
      const eventData: ModelArchivedData = {
        modelId: 'serialize-test-model',
        modelName: 'Serialization Test Model',
        version: '2.1.3',
        archivedBy: 'audit-user',
        archivedAt: new Date('2024-03-15T14:25:00Z'),
        previousStatus: ModelStatus.PUBLISHED,
        currentStatus: ModelStatus.ARCHIVED,
        reason: 'Data retention policy enforcement'
      };
      const event = new ModelArchived(eventData);

      // Act
      const serialized = event.toObject();

      // Assert
      expect(serialized.eventName).toBe('ModelArchived');
      expect(serialized.aggregateId).toBe('serialize-test-model');
      expect(serialized.eventData.modelName).toBe('Serialization Test Model');
      expect(serialized.eventData.version).toBe('2.1.3');
      expect(serialized.eventData.previousStatus).toBe(ModelStatus.PUBLISHED);
      expect(serialized.eventData.currentStatus).toBe(ModelStatus.ARCHIVED);
      expect(serialized.eventData.archivedBy).toBe('audit-user');
      expect(serialized.eventData.archivedAt).toBe('2024-03-15T14:25:00.000Z');
      expect(serialized.eventData.reason).toBe('Data retention policy enforcement');
      expect(serialized.occurredAt).toBeDefined();
      expect(serialized.eventVersion).toBe(1);
    });

    it('should handle serialization of event without optional reason', () => {
      // Arrange
      const event = new ModelArchived('no-reason-serialize', ModelStatus.DRAFT, 'test-user');

      // Act
      const serialized = event.toObject();

      // Assert
      expect(serialized.eventName).toBe('ModelArchived');
      expect(serialized.eventData.reason).toBeUndefined();
      expect(serialized.eventData.archivedBy).toBe('test-user');
      expect(serialized.eventData.previousStatus).toBe(ModelStatus.DRAFT);
    });
  });

  describe('Archive Event - State Transition Validation', () => {
    it('should capture valid DRAFT to ARCHIVED transition', () => {
      // Act
      const event = new ModelArchived('draft-archive', ModelStatus.DRAFT, 'transition-user');

      // Assert
      expect(event.previousStatus).toBe(ModelStatus.DRAFT);
      expect(event.currentStatus).toBe(ModelStatus.ARCHIVED);
    });

    it('should capture valid PUBLISHED to ARCHIVED transition', () => {
      // Act
      const event = new ModelArchived('published-archive', ModelStatus.PUBLISHED, 'lifecycle-user');

      // Assert
      expect(event.previousStatus).toBe(ModelStatus.PUBLISHED);
      expect(event.currentStatus).toBe(ModelStatus.ARCHIVED);
    });

    it('should always set currentStatus to ARCHIVED regardless of constructor pattern', () => {
      // Arrange & Act
      const dataPatternEvent = new ModelArchived({
        modelId: 'data-pattern-test',
        modelName: 'Data Pattern Test',
        version: '1.0.0',
        archivedBy: 'test-user',
        archivedAt: new Date(),
        previousStatus: ModelStatus.PUBLISHED,
        currentStatus: ModelStatus.ARCHIVED // This should be respected
      });

      const paramPatternEvent = new ModelArchived('param-pattern-test', ModelStatus.DRAFT, 'test-user');

      // Assert
      expect(dataPatternEvent.currentStatus).toBe(ModelStatus.ARCHIVED);
      expect(paramPatternEvent.currentStatus).toBe(ModelStatus.ARCHIVED);
    });
  });

  describe('Archive Event - Timestamp Handling', () => {
    it('should use provided archivedAt timestamp in data pattern', () => {
      // Arrange
      const specificTimestamp = new Date('2024-01-01T00:00:00Z');
      const eventData: ModelArchivedData = {
        modelId: 'timestamp-test',
        modelName: 'Timestamp Test',
        version: '1.0.0',
        archivedBy: 'time-user',
        archivedAt: specificTimestamp,
        previousStatus: ModelStatus.DRAFT,
        currentStatus: ModelStatus.ARCHIVED
      };

      // Act
      const event = new ModelArchived(eventData);

      // Assert
      expect(event.archivedAt).toEqual(specificTimestamp);
    });

    it('should generate current timestamp in individual parameters pattern', () => {
      // Arrange
      const beforeCreation = new Date();

      // Act
      const event = new ModelArchived('current-time-test', ModelStatus.PUBLISHED, 'time-user');
      const afterCreation = new Date();

      // Assert
      expect(event.archivedAt).toBeInstanceOf(Date);
      expect(event.archivedAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(event.archivedAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });

  describe('Archive Event - Compliance and Regulatory Requirements', () => {
    it('should capture all required audit information for compliance', () => {
      // Arrange
      const complianceData: ModelArchivedData = {
        modelId: 'compliance-model-789',
        modelName: 'Regulatory Compliance Model',
        version: '3.2.1',
        archivedBy: 'compliance-officer@company.com',
        archivedAt: new Date('2024-12-31T23:59:59Z'),
        previousStatus: ModelStatus.PUBLISHED,
        currentStatus: ModelStatus.ARCHIVED,
        reason: 'SOX compliance - 7 year retention period expired'
      };

      // Act
      const event = new ModelArchived(complianceData);

      // Assert - All audit trail fields present
      expect(event.aggregateId).toBeTruthy();
      expect(event.modelName).toBeTruthy();
      expect(event.version).toBeTruthy();
      expect(event.archivedBy).toBeTruthy();
      expect(event.archivedAt).toBeInstanceOf(Date);
      expect(event.previousStatus).toBeTruthy();
      expect(event.currentStatus).toBe(ModelStatus.ARCHIVED);
      expect(event.reason).toBeTruthy();
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should support traceability through serialized audit trail', () => {
      // Arrange
      const event = new ModelArchived(
        'traceability-model',
        ModelStatus.PUBLISHED,
        'audit-system',
        'Automated archival per data retention policy'
      );

      // Act
      const auditTrail = event.toObject();

      // Assert - Serialized data contains all traceability information
      expect(auditTrail.aggregateId).toBe('traceability-model');
      expect(auditTrail.eventData.archivedBy).toBe('audit-system');
      expect(auditTrail.eventData.reason).toBe('Automated archival per data retention policy');
      expect(auditTrail.eventData.previousStatus).toBe(ModelStatus.PUBLISHED);
      expect(auditTrail.occurredAt).toBeDefined();
      expect(auditTrail.eventVersion).toBe(1);
    });
  });
});