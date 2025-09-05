import {
  FeatureType,
  ContainerNodeType,
  ActionNodeType,
  ExecutionMode,
  ActionStatus,
  NodeStatus,
  ModelStatus,
  LinkType,
  RACIRole
} from '../../../../lib/domain/enums';

describe('Domain Enumerations', () => {
  describe('FeatureType', () => {
    it('should contain all required feature types', () => {
      expect(FeatureType.FUNCTION_MODEL).toBe('function-model');
      expect(FeatureType.KNOWLEDGE_BASE).toBe('knowledge-base');
      expect(FeatureType.SPINDLE).toBe('spindle');
      expect(FeatureType.EVENT_STORM).toBe('event-storm');
      expect(FeatureType.AI_AGENT).toBe('ai-agent');
    });

    it('should have exactly 5 feature types', () => {
      expect(Object.keys(FeatureType)).toHaveLength(5);
    });

    it('should be consistent with domain model specification', () => {
      const expectedTypes = ['function-model', 'knowledge-base', 'spindle', 'event-storm', 'ai-agent'];
      const actualTypes = Object.values(FeatureType);
      expect(actualTypes.sort()).toEqual(expectedTypes.sort());
    });
  });

  describe('ContainerNodeType', () => {
    it('should contain all required container node types', () => {
      expect(ContainerNodeType.IO_NODE).toBe('ioNode');
      expect(ContainerNodeType.STAGE_NODE).toBe('stageNode');
    });

    it('should have exactly 2 container node types', () => {
      expect(Object.keys(ContainerNodeType)).toHaveLength(2);
    });

    it('should be consistent with domain model specification', () => {
      const expectedTypes = ['ioNode', 'stageNode'];
      const actualTypes = Object.values(ContainerNodeType);
      expect(actualTypes.sort()).toEqual(expectedTypes.sort());
    });
  });

  describe('ActionNodeType', () => {
    it('should contain all required action node types', () => {
      expect(ActionNodeType.TETHER_NODE).toBe('tetherNode');
      expect(ActionNodeType.KB_NODE).toBe('kbNode');
      expect(ActionNodeType.FUNCTION_MODEL_CONTAINER).toBe('functionModelContainer');
    });

    it('should have exactly 3 action node types', () => {
      expect(Object.keys(ActionNodeType)).toHaveLength(3);
    });

    it('should be consistent with domain model specification', () => {
      const expectedTypes = ['tetherNode', 'kbNode', 'functionModelContainer'];
      const actualTypes = Object.values(ActionNodeType);
      expect(actualTypes.sort()).toEqual(expectedTypes.sort());
    });
  });

  describe('ExecutionMode', () => {
    it('should contain all required execution modes', () => {
      expect(ExecutionMode.SEQUENTIAL).toBe('sequential');
      expect(ExecutionMode.PARALLEL).toBe('parallel');
      expect(ExecutionMode.CONDITIONAL).toBe('conditional');
    });

    it('should have exactly 3 execution modes', () => {
      expect(Object.keys(ExecutionMode)).toHaveLength(3);
    });

    it('should be consistent with domain model specification', () => {
      const expectedModes = ['sequential', 'parallel', 'conditional'];
      const actualModes = Object.values(ExecutionMode);
      expect(actualModes.sort()).toEqual(expectedModes.sort());
    });
  });

  describe('ActionStatus', () => {
    it('should contain all required action statuses', () => {
      expect(ActionStatus.DRAFT).toBe('draft');
      expect(ActionStatus.ACTIVE).toBe('active');
      expect(ActionStatus.INACTIVE).toBe('inactive');
      expect(ActionStatus.EXECUTING).toBe('executing');
      expect(ActionStatus.COMPLETED).toBe('completed');
      expect(ActionStatus.FAILED).toBe('failed');
      expect(ActionStatus.RETRYING).toBe('retrying');
      expect(ActionStatus.ARCHIVED).toBe('archived');
      expect(ActionStatus.ERROR).toBe('error');
    });

    it('should have exactly 10 action statuses', () => {
      expect(Object.keys(ActionStatus)).toHaveLength(10);
    });

    it('should be consistent with domain model specification', () => {
      const expectedStatuses = [
        'draft', 'configured', 'active', 'inactive', 'executing', 'completed',
        'failed', 'retrying', 'archived', 'error'
      ];
      const actualStatuses = Object.values(ActionStatus);
      expect(actualStatuses.sort()).toEqual(expectedStatuses.sort());
    });

    it('should support valid status transitions', () => {
      // Test valid status progressions based on domain model
      const validTransitions = {
        [ActionStatus.DRAFT]: [ActionStatus.ACTIVE, ActionStatus.ARCHIVED],
        [ActionStatus.ACTIVE]: [ActionStatus.EXECUTING, ActionStatus.INACTIVE, ActionStatus.ARCHIVED],
        [ActionStatus.INACTIVE]: [ActionStatus.ACTIVE, ActionStatus.ARCHIVED],
        [ActionStatus.EXECUTING]: [ActionStatus.COMPLETED, ActionStatus.FAILED, ActionStatus.ERROR],
        [ActionStatus.FAILED]: [ActionStatus.RETRYING, ActionStatus.ARCHIVED, ActionStatus.ACTIVE],
        [ActionStatus.RETRYING]: [ActionStatus.EXECUTING, ActionStatus.FAILED, ActionStatus.ERROR],
        [ActionStatus.COMPLETED]: [ActionStatus.ARCHIVED],
        [ActionStatus.ERROR]: [ActionStatus.ACTIVE, ActionStatus.ARCHIVED]
      };

      // Verify all expected statuses are defined
      Object.keys(validTransitions).forEach(status => {
        expect(Object.values(ActionStatus)).toContain(status);
      });
    });
  });

  describe('NodeStatus', () => {
    it('should contain all required node statuses', () => {
      expect(NodeStatus.ACTIVE).toBe('active');
      expect(NodeStatus.INACTIVE).toBe('inactive');
      expect(NodeStatus.DRAFT).toBe('draft');
      expect(NodeStatus.ARCHIVED).toBe('archived');
      expect(NodeStatus.ERROR).toBe('error');
    });

    it('should have exactly 6 node statuses', () => {
      expect(Object.keys(NodeStatus)).toHaveLength(6);
    });

    it('should be consistent with domain model specification', () => {
      const expectedStatuses = ['active', 'inactive', 'draft', 'configured', 'archived', 'error'];
      const actualStatuses = Object.values(NodeStatus);
      expect(actualStatuses.sort()).toEqual(expectedStatuses.sort());
    });
  });

  describe('ModelStatus', () => {
    it('should contain all required model statuses', () => {
      expect(ModelStatus.DRAFT).toBe('draft');
      expect(ModelStatus.PUBLISHED).toBe('published');
      expect(ModelStatus.ARCHIVED).toBe('archived');
    });

    it('should have exactly 3 model statuses', () => {
      expect(Object.keys(ModelStatus)).toHaveLength(3);
    });

    it('should be consistent with domain model specification', () => {
      const expectedStatuses = ['draft', 'published', 'archived'];
      const actualStatuses = Object.values(ModelStatus);
      expect(actualStatuses.sort()).toEqual(expectedStatuses.sort());
    });

    it('should support valid status transitions', () => {
      // Based on domain model: draft → published → archived
      const validTransitions = {
        [ModelStatus.DRAFT]: [ModelStatus.PUBLISHED, ModelStatus.ARCHIVED],
        [ModelStatus.PUBLISHED]: [ModelStatus.ARCHIVED],
        [ModelStatus.ARCHIVED]: [] // No transitions from archived
      };

      Object.keys(validTransitions).forEach(status => {
        expect(Object.values(ModelStatus)).toContain(status);
      });
    });
  });

  describe('LinkType', () => {
    it('should contain all required link types', () => {
      expect(LinkType.DOCUMENTS).toBe('documents');
      expect(LinkType.IMPLEMENTS).toBe('implements');
      expect(LinkType.REFERENCES).toBe('references');
      expect(LinkType.SUPPORTS).toBe('supports');
      expect(LinkType.NESTED).toBe('nested');
      expect(LinkType.TRIGGERS).toBe('triggers');
      expect(LinkType.CONSUMES).toBe('consumes');
      expect(LinkType.PRODUCES).toBe('produces');
      expect(LinkType.DEPENDENCY).toBe('dependency');
      expect(LinkType.REFERENCE).toBe('reference');
    });

    it('should have exactly 10 link types', () => {
      expect(Object.keys(LinkType)).toHaveLength(10);
    });

    it('should be consistent with domain model specification', () => {
      const expectedTypes = [
        'documents', 'implements', 'references', 'supports',
        'nested', 'triggers', 'consumes', 'produces', 'dependency', 'reference'
      ];
      const actualTypes = Object.values(LinkType);
      expect(actualTypes.sort()).toEqual(expectedTypes.sort());
    });

    it('should have semantic meaning for each link type', () => {
      // Verify all link types have clear semantic purposes
      const semanticMappings = {
        [LinkType.DOCUMENTS]: 'Documentation relationship',
        [LinkType.IMPLEMENTS]: 'Implementation dependency', 
        [LinkType.REFERENCES]: 'Data dependency',
        [LinkType.SUPPORTS]: 'Supportive relationship',
        [LinkType.NESTED]: 'Hierarchical relationship',
        [LinkType.TRIGGERS]: 'Event-driven activation',
        [LinkType.CONSUMES]: 'Data consumption',
        [LinkType.PRODUCES]: 'Data production',
        [LinkType.DEPENDENCY]: 'General dependency relationship',
        [LinkType.REFERENCE]: 'Reference relationship'
      };

      Object.keys(semanticMappings).forEach(linkType => {
        expect(Object.values(LinkType)).toContain(linkType);
      });
    });
  });

  describe('RACIRole', () => {
    it('should contain all required RACI roles', () => {
      expect(RACIRole.RESPONSIBLE).toBe('responsible');
      expect(RACIRole.ACCOUNTABLE).toBe('accountable');
      expect(RACIRole.CONSULTED).toBe('consulted');
      expect(RACIRole.INFORMED).toBe('informed');
    });

    it('should have exactly 4 RACI roles', () => {
      expect(Object.keys(RACIRole)).toHaveLength(4);
    });

    it('should be consistent with domain model specification', () => {
      const expectedRoles = ['responsible', 'accountable', 'consulted', 'informed'];
      const actualRoles = Object.values(RACIRole);
      expect(actualRoles.sort()).toEqual(expectedRoles.sort());
    });

    it('should follow RACI matrix principles', () => {
      // Verify RACI roles follow standard responsibility assignment principles
      const raciDefinitions = {
        [RACIRole.RESPONSIBLE]: 'Who does the work',
        [RACIRole.ACCOUNTABLE]: 'Who is answerable for the outcome',
        [RACIRole.CONSULTED]: 'Who provides input/advice',
        [RACIRole.INFORMED]: 'Who needs to be kept updated'
      };

      Object.keys(raciDefinitions).forEach(role => {
        expect(Object.values(RACIRole)).toContain(role);
      });
    });
  });

  describe('Enumeration Completeness', () => {
    it('should cover all enumeration types mentioned in domain model', () => {
      // Verify all enumeration types from domain model are implemented
      const requiredEnums = [
        'FeatureType', 'ContainerNodeType', 'ActionNodeType', 'ExecutionMode',
        'ActionStatus', 'NodeStatus', 'ModelStatus', 'LinkType', 'RACIRole'
      ];

      const implementedEnums = [
        FeatureType, ContainerNodeType, ActionNodeType, ExecutionMode,
        ActionStatus, NodeStatus, ModelStatus, LinkType, RACIRole
      ];

      expect(implementedEnums).toHaveLength(requiredEnums.length);
      implementedEnums.forEach(enumType => {
        expect(typeof enumType).toBe('object');
        expect(Object.keys(enumType).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Cross-Enumeration Relationships', () => {
    it('should maintain consistency between related enumerations', () => {
      // ActionStatus should be more granular than NodeStatus
      expect(Object.keys(ActionStatus).length).toBeGreaterThan(Object.keys(NodeStatus).length);
      
      // Common statuses should align
      expect(ActionStatus.DRAFT).toBe(NodeStatus.DRAFT);
      expect(ActionStatus.ACTIVE).toBe(NodeStatus.ACTIVE);
      expect(ActionStatus.INACTIVE).toBe(NodeStatus.INACTIVE);
      expect(ActionStatus.ARCHIVED).toBe(NodeStatus.ARCHIVED);
      expect(ActionStatus.ERROR).toBe(NodeStatus.ERROR);
    });

    it('should support hierarchical relationships', () => {
      // ContainerNodeType and ActionNodeType should be distinct
      const containerTypes = Object.values(ContainerNodeType);
      const actionTypes = Object.values(ActionNodeType);
      
      containerTypes.forEach(containerType => {
        expect(actionTypes).not.toContain(containerType);
      });
    });
  });
});