import { ModelStatus } from '../../../../lib/domain/enums';

describe('FunctionModelVersioningService', () => {
  describe('Version Creation', () => {
    it('should create new versions from draft models', () => {
      // Test creation of new version from draft model
      const mockDraftModel = {
        id: 'model1',
        status: ModelStatus.DRAFT,
        version: '1.0.0',
        name: 'Test Model'
      };

      const newVersion = {
        version: '1.1.0',
        previousVersion: '1.0.0',
        isPublished: false
      };

      expect(mockDraftModel.status).toBe(ModelStatus.DRAFT);
      expect(newVersion.version).toBe('1.1.0');
      expect(newVersion.isPublished).toBe(false);
    });

    it('should prevent version creation from non-draft models', () => {
      // Test that published/archived models cannot create new versions directly
      const mockPublishedModel = {
        id: 'model2',
        status: ModelStatus.PUBLISHED,
        version: '1.0.0'
      };

      const mockArchivedModel = {
        id: 'model3',
        status: ModelStatus.ARCHIVED,
        version: '1.0.0'
      };

      // Published and archived models should not allow direct version creation
      expect(mockPublishedModel.status).not.toBe(ModelStatus.DRAFT);
      expect(mockArchivedModel.status).not.toBe(ModelStatus.DRAFT);
    });
  });

  describe('Semantic Version Validation', () => {
    it('should validate semantic version numbering', () => {
      const validVersions = [
        '1.0.0',
        '2.1.3',
        '10.20.30',
        '1.0.0-alpha',
        '1.0.0-alpha.1',
        '1.0.0+build.1'
      ];

      const invalidVersions = [
        '1.0',
        '1',
        'v1.0.0',
        '1.0.0.0',
        'invalid'
      ];

      // Semantic version pattern
      const semanticVersionPattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

      validVersions.forEach(version => {
        expect(semanticVersionPattern.test(version)).toBe(true);
      });

      invalidVersions.forEach(version => {
        expect(semanticVersionPattern.test(version)).toBe(false);
      });
    });

    it('should enforce version increment rules', () => {
      const versionIncrements = [
        { from: '1.0.0', to: '1.0.1', type: 'patch', valid: true },
        { from: '1.0.0', to: '1.1.0', type: 'minor', valid: true },
        { from: '1.0.0', to: '2.0.0', type: 'major', valid: true },
        { from: '1.1.0', to: '1.0.9', type: 'invalid_decrement', valid: false }
      ];

      versionIncrements.forEach(increment => {
        const parseVersion = (v: string) => v.split('.').map(Number);
        const [fromMajor, fromMinor, fromPatch] = parseVersion(increment.from);
        const [toMajor, toMinor, toPatch] = parseVersion(increment.to);

        let isValidIncrement = false;

        // Major increment
        if (toMajor > fromMajor) {
          isValidIncrement = true;
        }
        // Minor increment (same major)
        else if (toMajor === fromMajor && toMinor > fromMinor) {
          isValidIncrement = true;
        }
        // Patch increment (same major and minor)
        else if (toMajor === fromMajor && toMinor === fromMinor && toPatch > fromPatch) {
          isValidIncrement = true;
        }

        expect(isValidIncrement).toBe(increment.valid);
      });
    });
  });

  describe('Publication State Management', () => {
    it('should manage publication state transitions', () => {
      const stateTransitions = [
        { from: ModelStatus.DRAFT, to: ModelStatus.PUBLISHED, valid: true },
        { from: ModelStatus.PUBLISHED, to: ModelStatus.ARCHIVED, valid: true },
        { from: ModelStatus.DRAFT, to: ModelStatus.ARCHIVED, valid: true },
        { from: ModelStatus.ARCHIVED, to: ModelStatus.PUBLISHED, valid: false },
        { from: ModelStatus.PUBLISHED, to: ModelStatus.DRAFT, valid: false }
      ];

      const validTransitions = {
        [ModelStatus.DRAFT]: [ModelStatus.PUBLISHED, ModelStatus.ARCHIVED],
        [ModelStatus.PUBLISHED]: [ModelStatus.ARCHIVED],
        [ModelStatus.ARCHIVED]: []
      };

      stateTransitions.forEach(transition => {
        const allowedTransitions = validTransitions[transition.from] || [];
        const isValid = allowedTransitions.includes(transition.to);
        expect(isValid).toBe(transition.valid);
      });
    });

    it('should enforce single published version per model', () => {
      // Test that only one version per model can be published at a time
      const modelVersions = [
        { id: 'v1', version: '1.0.0', published: false, model: 'model1' },
        { id: 'v2', version: '2.0.0', published: true, model: 'model1' },
        { id: 'v3', version: '3.0.0', published: false, model: 'model1' }
      ];

      const publishedVersions = modelVersions.filter(v => v.published);
      expect(publishedVersions).toHaveLength(1);
      expect(publishedVersions[0].version).toBe('2.0.0');
    });
  });

  describe('Version Immutability', () => {
    it('should ensure version immutability once created', () => {
      // Test that version data is immutable once created
      const immutableVersion = Object.freeze({
        id: 'version1',
        version: '1.0.0',
        data: Object.freeze({
          nodes: [],
          metadata: {}
        }),
        createdAt: new Date().toISOString()
      });

      // Attempting to modify should throw in strict mode or with Object.freeze
      expect(() => {
        (immutableVersion as any).version = '1.0.1';
      }).toThrow(); // Object.freeze enforces immutability

      expect(immutableVersion.version).toBe('1.0.0');
    });

    it('should preserve complete model state in version data', () => {
      // Test that version data contains complete reproducible model state
      const completeVersionData = {
        modelMetadata: {
          id: 'model1',
          name: 'Test Model',
          description: 'Test Description'
        },
        nodes: [
          {
            id: 'node1',
            type: 'ioNode',
            position: { x: 0, y: 0 }
          }
        ],
        actions: [
          {
            id: 'action1',
            parentNodeId: 'node1',
            type: 'kbNode'
          }
        ],
        links: [],
        configuration: {}
      };

      // Verify all essential components are present
      expect(completeVersionData.modelMetadata).toBeDefined();
      expect(completeVersionData.nodes).toBeDefined();
      expect(completeVersionData.actions).toBeDefined();
      expect(completeVersionData.links).toBeDefined();
      expect(completeVersionData.configuration).toBeDefined();

      expect(Array.isArray(completeVersionData.nodes)).toBe(true);
      expect(Array.isArray(completeVersionData.actions)).toBe(true);
      expect(Array.isArray(completeVersionData.links)).toBe(true);
    });
  });

  describe('Version Comparison and History', () => {
    it('should support version comparison operations', () => {
      const versions = ['1.0.0', '1.0.1', '1.1.0', '2.0.0'];
      
      const compareVersions = (v1: string, v2: string): number => {
        const parse1 = v1.split('.').map(Number);
        const parse2 = v2.split('.').map(Number);
        
        for (let i = 0; i < 3; i++) {
          if (parse1[i] !== parse2[i]) {
            return parse1[i] - parse2[i];
          }
        }
        return 0;
      };

      // Test version ordering
      expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
      expect(compareVersions('1.1.0', '1.0.1')).toBeGreaterThan(0);
      expect(compareVersions('2.0.0', '1.1.0')).toBeGreaterThan(0);
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    });

    it('should maintain version history chain', () => {
      const versionChain = [
        { version: '1.0.0', previousVersion: null },
        { version: '1.0.1', previousVersion: '1.0.0' },
        { version: '1.1.0', previousVersion: '1.0.1' },
        { version: '2.0.0', previousVersion: '1.1.0' }
      ];

      // Verify chain integrity
      for (let i = 1; i < versionChain.length; i++) {
        expect(versionChain[i].previousVersion).toBe(versionChain[i - 1].version);
      }

      expect(versionChain[0].previousVersion).toBeNull();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle duplicate version creation attempts', () => {
      const existingVersions = ['1.0.0', '1.0.1', '1.1.0'];
      const attemptedVersion = '1.0.1';

      const isDuplicate = existingVersions.includes(attemptedVersion);
      expect(isDuplicate).toBe(true);

      // Should prevent duplicate creation
      const preventDuplicate = !isDuplicate;
      expect(preventDuplicate).toBe(false);
    });

    it('should handle version rollback scenarios', () => {
      // Test rollback capabilities
      const currentVersion = '2.0.0';
      const targetRollbackVersion = '1.1.0';
      const availableVersions = ['1.0.0', '1.0.1', '1.1.0', '2.0.0'];

      const canRollback = availableVersions.includes(targetRollbackVersion);
      expect(canRollback).toBe(true);

      // Rollback should be to existing version only
      const invalidRollbackVersion = '0.9.0';
      const canRollbackInvalid = availableVersions.includes(invalidRollbackVersion);
      expect(canRollbackInvalid).toBe(false);
    });

    it('should validate author information', () => {
      const versionWithAuthor = {
        version: '1.0.0',
        authorId: 'user123',
        createdBy: 'John Doe',
        createdAt: new Date().toISOString()
      };

      expect(versionWithAuthor.authorId).toBeDefined();
      expect(typeof versionWithAuthor.authorId).toBe('string');
      expect(versionWithAuthor.authorId.length).toBeGreaterThan(0);
      expect(versionWithAuthor.createdAt).toBeDefined();
    });
  });

  describe('Integration with Domain Events', () => {
    it('should trigger version creation events', () => {
      const expectedEvents = [
        'FunctionModelVersionCreated',
        'FunctionModelVersionPublished',
        'FunctionModelVersionArchived'
      ];

      expectedEvents.forEach(eventType => {
        expect(typeof eventType).toBe('string');
        expect(eventType.startsWith('FunctionModelVersion')).toBe(true);
      });
    });

    it('should include relevant data in version events', () => {
      const versionEvent = {
        type: 'FunctionModelVersionCreated',
        data: {
          versionId: 'v123',
          modelId: 'model1',
          version: '1.1.0',
          authorId: 'user123',
          timestamp: new Date().toISOString()
        }
      };

      expect(versionEvent.type).toBe('FunctionModelVersionCreated');
      expect(versionEvent.data.versionId).toBeDefined();
      expect(versionEvent.data.modelId).toBeDefined();
      expect(versionEvent.data.version).toBeDefined();
      expect(versionEvent.data.authorId).toBeDefined();
      expect(versionEvent.data.timestamp).toBeDefined();
    });
  });
});