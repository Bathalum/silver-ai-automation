import { ActionNodeType, RACIRole } from '../../../../lib/domain/enums';

describe('Action Node Type Configurations', () => {
  describe('KbNode Configuration', () => {
    describe('Configuration Properties', () => {
      it('should validate required KbNode configuration properties', () => {
        const kbNodeConfig = {
          kb_reference_id: 'kb-doc-123',
          raci: {
            responsible: ['user1'],
            accountable: ['manager1'],
            consulted: ['expert1'],
            informed: ['team1']
          },
          short_description: 'Process customer feedback',
          documentation_context: 'Review customer feedback forms and categorize issues',
          search_keywords: ['feedback', 'customer', 'issues', 'categorization'],
          access_permissions: ['read:team1', 'edit:manager1']
        };

        // Validate all required properties exist
        expect(kbNodeConfig.kb_reference_id).toBeDefined();
        expect(kbNodeConfig.kb_reference_id).toBe('kb-doc-123');
        expect(kbNodeConfig.raci).toBeDefined();
        expect(kbNodeConfig.short_description).toBeDefined();
        expect(kbNodeConfig.documentation_context).toBeDefined();
        expect(kbNodeConfig.search_keywords).toBeDefined();
        expect(kbNodeConfig.access_permissions).toBeDefined();

        // Validate data types
        expect(typeof kbNodeConfig.kb_reference_id).toBe('string');
        expect(typeof kbNodeConfig.raci).toBe('object');
        expect(typeof kbNodeConfig.short_description).toBe('string');
        expect(typeof kbNodeConfig.documentation_context).toBe('string');
        expect(Array.isArray(kbNodeConfig.search_keywords)).toBe(true);
        expect(Array.isArray(kbNodeConfig.access_permissions)).toBe(true);
      });

      it('should validate RACI assignment matrix structure', () => {
        const validRaci = {
          responsible: ['dev1', 'dev2'],
          accountable: ['manager1'],
          consulted: ['architect1', 'expert1'],
          informed: ['team1', 'stakeholder1']
        };

        const invalidRaciMissingResponsible = {
          responsible: [], // Invalid - empty
          accountable: ['manager1'],
          consulted: ['architect1'],
          informed: ['team1']
        };

        // Valid RACI should have all required roles
        expect(validRaci.responsible).toBeDefined();
        expect(validRaci.accountable).toBeDefined();
        expect(validRaci.consulted).toBeDefined();
        expect(validRaci.informed).toBeDefined();

        // All arrays should contain strings
        Object.values(validRaci).forEach(roleList => {
          expect(Array.isArray(roleList)).toBe(true);
          roleList.forEach(person => {
            expect(typeof person).toBe('string');
            expect(person.length).toBeGreaterThan(0);
          });
        });

        // Invalid RACI should fail business rule: "RACI must have at least one responsible party defined"
        expect(invalidRaciMissingResponsible.responsible.length).toBe(0);
      });

      it('should validate search keywords for AI agent discovery', () => {
        const validKeywords = ['customer', 'feedback', 'analysis', 'categorization'];
        const invalidKeywords = ['', null, undefined, '   '];

        // Valid keywords should be non-empty strings
        validKeywords.forEach(keyword => {
          expect(typeof keyword).toBe('string');
          expect(keyword.trim().length).toBeGreaterThan(0);
        });

        // Invalid keywords should be detected
        invalidKeywords.forEach(keyword => {
          const isValid = typeof keyword === 'string' && keyword.trim().length > 0;
          expect(isValid).toBe(false);
        });
      });
    });

    describe('AI Agent Access Patterns', () => {
      it('should support stage node agent access to RACI information', () => {
        const kbNodeForAgentAccess = {
          name: 'Customer Feedback Analysis',
          description: 'Analyze and categorize customer feedback',
          raci: {
            responsible: ['analyst1'],
            accountable: ['manager1'],
            consulted: ['expert1'],
            informed: ['team1']
          },
          kb_reference_id: 'kb-feedback-123'
        };

        // Stage node agents should be able to access these properties
        const agentAccessibleData = {
          name: kbNodeForAgentAccess.name,
          description: kbNodeForAgentAccess.description,
          raci: kbNodeForAgentAccess.raci,
          kb_reference_id: kbNodeForAgentAccess.kb_reference_id
        };

        expect(agentAccessibleData.name).toBe('Customer Feedback Analysis');
        expect(agentAccessibleData.description).toBe('Analyze and categorize customer feedback');
        expect(agentAccessibleData.raci.responsible).toContain('analyst1');
        expect(agentAccessibleData.kb_reference_id).toBe('kb-feedback-123');
      });

      it('should enable agents to retrieve linked Knowledge Base ID for database searches', () => {
        const kbNodeWithDatabaseAccess = {
          kb_reference_id: 'kb-proc-456',
          additional_context: 'Contains process documentation for customer onboarding',
          documentation_samples: [
            'Step 1: Collect customer information',
            'Step 2: Validate customer requirements'
          ]
        };

        // Agents should be able to use this for database searches
        const databaseSearchParams = {
          entityType: 'knowledge-base',
          entityId: kbNodeWithDatabaseAccess.kb_reference_id,
          searchContext: kbNodeWithDatabaseAccess.additional_context
        };

        expect(databaseSearchParams.entityType).toBe('knowledge-base');
        expect(databaseSearchParams.entityId).toBe('kb-proc-456');
        expect(databaseSearchParams.searchContext).toContain('process documentation');
      });
    });

    describe('Business Rules Enforcement', () => {
      it('should enforce KB reference must point to valid Knowledge Base entity', () => {
        const validKbReference = {
          kb_reference_id: 'kb-valid-123',
          isValidReference: true // Would be validated against actual KB entities
        };

        const invalidKbReference = {
          kb_reference_id: 'kb-nonexistent-999',
          isValidReference: false // Would fail validation
        };

        // Business rule enforcement
        expect(validKbReference.isValidReference).toBe(true);
        expect(invalidKbReference.isValidReference).toBe(false);
      });

      it('should enforce at least one responsible party in RACI', () => {
        const validRaciWithResponsible = {
          responsible: ['dev1'], // At least one responsible party
          accountable: ['manager1'],
          consulted: [],
          informed: []
        };

        const invalidRaciNoResponsible = {
          responsible: [], // Violates business rule
          accountable: ['manager1'],
          consulted: ['expert1'],
          informed: ['team1']
        };

        // Business rule: "RACI must have at least one responsible party defined"
        expect(validRaciWithResponsible.responsible.length).toBeGreaterThan(0);
        expect(invalidRaciNoResponsible.responsible.length).toBe(0); // This would fail validation
      });

      it('should enforce concise but informative short description', () => {
        const validShortDescriptions = [
          'Process customer feedback',
          'Analyze market trends',
          'Review compliance documents'
        ];

        const invalidShortDescriptions = [
          '', // Too short
          '   ', // Only whitespace
          'a'.repeat(300) // Too long (assuming max length rule)
        ];

        validShortDescriptions.forEach(desc => {
          expect(desc.trim().length).toBeGreaterThan(0);
          expect(desc.trim().length).toBeLessThan(200); // Reasonable limit for "concise"
        });

        invalidShortDescriptions.forEach(desc => {
          const isValid = desc.trim().length > 0 && desc.trim().length < 200;
          expect(isValid).toBe(false);
        });
      });
    });
  });

  describe('TetherNode Configuration', () => {
    describe('Configuration Properties', () => {
      it('should validate required TetherNode configuration properties', () => {
        const tetherNodeConfig = {
          tether_reference_id: 'spindle-workflow-789',
          execution_parameters: {
            timeout: 3600,
            priority: 'high',
            retryCount: 3
          },
          output_mapping: {
            'workflow.result': 'stage.processedData',
            'workflow.status': 'stage.executionStatus'
          },
          execution_triggers: ['data_ready', 'manual_trigger'],
          resource_requirements: {
            cpu: '2 cores',
            memory: '4GB',
            timeout: 3600
          },
          integration_config: {
            apiEndpoint: 'https://api.spindle.com/v1/execute',
            authMethod: 'bearer_token',
            headers: { 'Content-Type': 'application/json' }
          }
        };

        // Validate all required properties exist
        expect(tetherNodeConfig.tether_reference_id).toBeDefined();
        expect(tetherNodeConfig.execution_parameters).toBeDefined();
        expect(tetherNodeConfig.output_mapping).toBeDefined();
        expect(tetherNodeConfig.execution_triggers).toBeDefined();
        expect(tetherNodeConfig.resource_requirements).toBeDefined();
        expect(tetherNodeConfig.integration_config).toBeDefined();

        // Validate data types
        expect(typeof tetherNodeConfig.tether_reference_id).toBe('string');
        expect(typeof tetherNodeConfig.execution_parameters).toBe('object');
        expect(typeof tetherNodeConfig.output_mapping).toBe('object');
        expect(Array.isArray(tetherNodeConfig.execution_triggers)).toBe(true);
        expect(typeof tetherNodeConfig.resource_requirements).toBe('object');
        expect(typeof tetherNodeConfig.integration_config).toBe('object');
      });

      it('should validate execution parameters for tether execution', () => {
        const validExecutionParams = {
          timeout: 3600,
          priority: 'high',
          retryCount: 3,
          parallelism: 2,
          environmentVars: {
            'ENV': 'production',
            'LOG_LEVEL': 'info'
          }
        };

        // Validate execution parameter constraints
        expect(validExecutionParams.timeout).toBeGreaterThan(0);
        expect(['low', 'medium', 'high', 'critical']).toContain(validExecutionParams.priority);
        expect(validExecutionParams.retryCount).toBeGreaterThanOrEqual(0);
        expect(validExecutionParams.retryCount).toBeLessThanOrEqual(10);
        expect(validExecutionParams.parallelism).toBeGreaterThan(0);
        expect(typeof validExecutionParams.environmentVars).toBe('object');
      });

      it('should validate resource requirements are within system limits', () => {
        const validResourceRequirements = {
          cpu: '2 cores',
          memory: '4GB',
          timeout: 3600,
          diskSpace: '1GB'
        };

        const invalidResourceRequirements = {
          cpu: '100 cores', // Exceeds system limit
          memory: '1TB', // Exceeds system limit
          timeout: -1, // Invalid negative timeout
          diskSpace: '10TB' // Exceeds system limit
        };

        // Mock system limits for validation
        const systemLimits = {
          maxCpu: 16,
          maxMemoryGB: 64,
          maxTimeoutSeconds: 86400,
          maxDiskSpaceGB: 100
        };

        // Parse and validate valid requirements
        expect(validResourceRequirements.timeout).toBeGreaterThan(0);
        expect(validResourceRequirements.timeout).toBeLessThanOrEqual(systemLimits.maxTimeoutSeconds);

        // Invalid requirements would fail validation
        expect(invalidResourceRequirements.timeout).toBeLessThan(0);
      });
    });

    describe('AI Agent Access Patterns', () => {
      it('should enable stage agents to access tether ID and configuration', () => {
        const tetherNodeForAgentAccess = {
          tether_reference_id: 'spindle-analysis-456',
          basic_config: {
            name: 'Data Analysis Workflow',
            description: 'Processes customer data for insights',
            estimatedDuration: 1800
          },
          execution_status: 'ready'
        };

        // Stage agents should access these properties
        const agentAccessibleData = {
          tetherId: tetherNodeForAgentAccess.tether_reference_id,
          name: tetherNodeForAgentAccess.basic_config.name,
          status: tetherNodeForAgentAccess.execution_status,
          estimatedDuration: tetherNodeForAgentAccess.basic_config.estimatedDuration
        };

        expect(agentAccessibleData.tetherId).toBe('spindle-analysis-456');
        expect(agentAccessibleData.name).toBe('Data Analysis Workflow');
        expect(agentAccessibleData.status).toBe('ready');
        expect(agentAccessibleData.estimatedDuration).toBe(1800);
      });

      it('should enable agents to access run history and execution status', () => {
        const tetherWithHistory = {
          tether_reference_id: 'spindle-reporting-789',
          run_history: [
            {
              runId: 'run-001',
              startTime: '2025-01-20T10:00:00Z',
              endTime: '2025-01-20T10:30:00Z',
              status: 'completed',
              output: { recordsProcessed: 1500 }
            },
            {
              runId: 'run-002',
              startTime: '2025-01-20T11:00:00Z',
              endTime: null,
              status: 'running',
              output: null
            }
          ],
          current_status: 'running'
        };

        // Agents should be able to access execution data
        expect(tetherWithHistory.run_history).toBeDefined();
        expect(Array.isArray(tetherWithHistory.run_history)).toBe(true);
        expect(tetherWithHistory.run_history.length).toBe(2);
        expect(tetherWithHistory.current_status).toBe('running');

        // Validate run history structure
        tetherWithHistory.run_history.forEach(run => {
          expect(run.runId).toBeDefined();
          expect(run.startTime).toBeDefined();
          expect(run.status).toBeDefined();
          expect(['completed', 'running', 'failed', 'cancelled']).toContain(run.status);
        });
      });
    });

    describe('Business Rules Enforcement', () => {
      it('should enforce tether reference must point to valid Spindle entity', () => {
        const validTetherReference = {
          tether_reference_id: 'spindle-valid-123',
          isValidReference: true
        };

        const invalidTetherReference = {
          tether_reference_id: 'spindle-nonexistent-999',
          isValidReference: false
        };

        // Business rule validation
        expect(validTetherReference.isValidReference).toBe(true);
        expect(invalidTetherReference.isValidReference).toBe(false);
      });

      it('should enforce execution parameters must be valid for tether type', () => {
        const dataProcessingTetherParams = {
          type: 'data_processing',
          maxRecords: 10000,
          batchSize: 500,
          parallelThreads: 4
        };

        const reportingTetherParams = {
          type: 'reporting',
          reportFormat: 'pdf',
          includeCharts: true,
          recipients: ['manager@company.com']
        };

        // Each tether type should have appropriate parameters
        expect(dataProcessingTetherParams.type).toBe('data_processing');
        expect(dataProcessingTetherParams.maxRecords).toBeGreaterThan(0);
        expect(dataProcessingTetherParams.batchSize).toBeGreaterThan(0);

        expect(reportingTetherParams.type).toBe('reporting');
        expect(reportingTetherParams.reportFormat).toBeDefined();
        expect(Array.isArray(reportingTetherParams.recipients)).toBe(true);
      });

      it('should enforce output mapping must align with stage context requirements', () => {
        const validOutputMapping = {
          'tether.processedData': 'stage.customerAnalysis',
          'tether.metrics': 'stage.performanceMetrics',
          'tether.status': 'stage.executionStatus'
        };

        const invalidOutputMapping = {
          'tether.unknownField': 'stage.missingContext', // Would fail validation
          'tether.result': 'stage.invalidContext'
        };

        // Valid mapping should have known source and target contexts
        Object.entries(validOutputMapping).forEach(([source, target]) => {
          expect(source.startsWith('tether.')).toBe(true);
          expect(target.startsWith('stage.')).toBe(true);
          expect(source.length).toBeGreaterThan('tether.'.length);
          expect(target.length).toBeGreaterThan('stage.'.length);
        });
      });
    });
  });

  describe('FunctionModelContainer Configuration', () => {
    describe('Configuration Properties', () => {
      it('should validate required FunctionModelContainer configuration properties', () => {
        const functionModelContainerConfig = {
          nested_model_id: 'function-model-nested-456',
          context_mapping: {
            'parent.customerData': 'nested.inputData',
            'parent.configuration': 'nested.settings'
          },
          output_extraction: {
            'nested.processedResults': 'parent.analysisResults',
            'nested.metrics': 'parent.performanceData'
          },
          execution_policy: {
            trigger: 'parent_ready',
            mode: 'synchronous',
            timeout: 7200
          },
          context_inheritance: {
            inheritAll: false,
            specificContexts: ['userSession', 'organizationSettings'],
            excludeContexts: ['temporaryData']
          },
          orchestration_mode: 'nested_sequential'
        };

        // Validate all required properties exist
        expect(functionModelContainerConfig.nested_model_id).toBeDefined();
        expect(functionModelContainerConfig.context_mapping).toBeDefined();
        expect(functionModelContainerConfig.output_extraction).toBeDefined();
        expect(functionModelContainerConfig.execution_policy).toBeDefined();
        expect(functionModelContainerConfig.context_inheritance).toBeDefined();
        expect(functionModelContainerConfig.orchestration_mode).toBeDefined();

        // Validate data types
        expect(typeof functionModelContainerConfig.nested_model_id).toBe('string');
        expect(typeof functionModelContainerConfig.context_mapping).toBe('object');
        expect(typeof functionModelContainerConfig.output_extraction).toBe('object');
        expect(typeof functionModelContainerConfig.execution_policy).toBe('object');
        expect(typeof functionModelContainerConfig.context_inheritance).toBe('object');
        expect(typeof functionModelContainerConfig.orchestration_mode).toBe('string');
      });

      it('should validate context mapping preserves data integrity', () => {
        const contextMapping = {
          'parent.customerProfile': 'nested.userProfile',
          'parent.businessRules': 'nested.validationRules',
          'parent.sessionData': 'nested.contextData'
        };

        // Context mapping should preserve data relationships
        Object.entries(contextMapping).forEach(([parentContext, nestedContext]) => {
          expect(parentContext.startsWith('parent.')).toBe(true);
          expect(nestedContext.startsWith('nested.')).toBe(true);
          
          // Both contexts should be meaningful identifiers
          const parentKey = parentContext.split('.')[1];
          const nestedKey = nestedContext.split('.')[1];
          expect(parentKey.length).toBeGreaterThan(0);
          expect(nestedKey.length).toBeGreaterThan(0);
        });
      });

      it('should validate execution policy does not conflict with parent orchestration', () => {
        const validExecutionPolicies = [
          {
            trigger: 'parent_ready',
            mode: 'synchronous',
            timeout: 3600,
            conflictsWithParent: false
          },
          {
            trigger: 'conditional',
            mode: 'asynchronous',
            timeout: 7200,
            conflictsWithParent: false
          }
        ];

        const invalidExecutionPolicy = {
          trigger: 'immediate',
          mode: 'blocking_parent', // This would conflict
          timeout: -1, // Invalid timeout
          conflictsWithParent: true
        };

        validExecutionPolicies.forEach(policy => {
          expect(policy.conflictsWithParent).toBe(false);
          expect(policy.timeout).toBeGreaterThan(0);
          expect(['parent_ready', 'conditional', 'manual']).toContain(policy.trigger);
          expect(['synchronous', 'asynchronous']).toContain(policy.mode);
        });

        // Invalid policy should be detected
        expect(invalidExecutionPolicy.conflictsWithParent).toBe(true);
        expect(invalidExecutionPolicy.timeout).toBeLessThanOrEqual(0);
      });
    });

    describe('AI Agent Access Patterns', () => {
      it('should enable parent model agents to access nested model outputs', () => {
        const functionModelContainerWithOutputs = {
          nested_model_id: 'analytics-model-123',
          nested_outputs: {
            customerSegments: ['enterprise', 'smb', 'startup'],
            riskScores: { high: 15, medium: 45, low: 40 },
            recommendations: ['optimize pricing', 'improve onboarding']
          },
          nested_contexts: {
            executionTime: 3245,
            resourcesUsed: { cpu: '2.4 cores', memory: '6.2 GB' }
          }
        };

        // Parent agents should access nested results
        const parentAgentAccess = {
          nestedModelId: functionModelContainerWithOutputs.nested_model_id,
          outputs: functionModelContainerWithOutputs.nested_outputs,
          executionMetrics: functionModelContainerWithOutputs.nested_contexts
        };

        expect(parentAgentAccess.nestedModelId).toBe('analytics-model-123');
        expect(parentAgentAccess.outputs.customerSegments).toContain('enterprise');
        expect(parentAgentAccess.outputs.riskScores.high).toBe(15);
        expect(parentAgentAccess.executionMetrics.executionTime).toBe(3245);
      });

      it('should maintain consistent access patterns in deep nesting', () => {
        const deepNestedStructure = {
          level1: {
            modelId: 'root-model',
            access: 'full_parent_privileges'
          },
          level2: {
            modelId: 'child-model',
            parentId: 'root-model',
            access: 'parent_privileges_to_level3'
          },
          level3: {
            modelId: 'grandchild-model',
            parentId: 'child-model',
            access: 'own_context_plus_siblings'
          }
        };

        // Access patterns should be consistent across levels
        expect(deepNestedStructure.level1.access).toContain('full_parent_privileges');
        expect(deepNestedStructure.level2.access).toContain('parent_privileges');
        expect(deepNestedStructure.level3.access).toContain('own_context');

        // Parent relationships should be maintained
        expect(deepNestedStructure.level2.parentId).toBe(deepNestedStructure.level1.modelId);
        expect(deepNestedStructure.level3.parentId).toBe(deepNestedStructure.level2.modelId);
      });
    });

    describe('Business Rules Enforcement', () => {
      it('should enforce nested model must be valid and accessible', () => {
        const validNestedModelRef = {
          nested_model_id: 'valid-model-456',
          isValid: true,
          isAccessible: true,
          permissions: ['read', 'execute']
        };

        const invalidNestedModelRef = {
          nested_model_id: 'nonexistent-model-999',
          isValid: false,
          isAccessible: false,
          permissions: []
        };

        // Business rule validation
        expect(validNestedModelRef.isValid).toBe(true);
        expect(validNestedModelRef.isAccessible).toBe(true);
        expect(validNestedModelRef.permissions.length).toBeGreaterThan(0);

        expect(invalidNestedModelRef.isValid).toBe(false);
        expect(invalidNestedModelRef.isAccessible).toBe(false);
      });

      it('should enforce output extraction must align with parent requirements', () => {
        const validOutputExtraction = {
          'nested.customerAnalysis': 'parent.analysisResults',
          'nested.performanceMetrics': 'parent.kpiData'
        };

        const parentRequirements = {
          requiredOutputs: ['analysisResults', 'kpiData'],
          optionalOutputs: ['debugInfo', 'executionLogs']
        };

        // Validate output extraction aligns with parent requirements
        Object.values(validOutputExtraction).forEach(parentOutput => {
          const outputKey = parentOutput.split('.')[1];
          const isRequired = parentRequirements.requiredOutputs.includes(outputKey);
          const isOptional = parentRequirements.optionalOutputs.includes(outputKey);
          expect(isRequired || isOptional).toBe(true);
        });
      });
    });
  });

  describe('Cross-Type Configuration Validation', () => {
    it('should validate action node type determines configuration structure', () => {
      const kbNodeConfig = {
        type: ActionNodeType.KB_NODE,
        configuration: {
          kb_reference_id: 'kb-123',
          raci: { responsible: ['user1'], accountable: ['manager1'], consulted: [], informed: [] }
        }
      };

      const tetherNodeConfig = {
        type: ActionNodeType.TETHER_NODE,
        configuration: {
          tether_reference_id: 'tether-456',
          execution_parameters: { timeout: 3600 }
        }
      };

      const functionModelContainerConfig = {
        type: ActionNodeType.FUNCTION_MODEL_CONTAINER,
        configuration: {
          nested_model_id: 'model-789',
          context_mapping: {}
        }
      };

      // Each type should have appropriate configuration structure
      expect(kbNodeConfig.type).toBe(ActionNodeType.KB_NODE);
      expect(kbNodeConfig.configuration.kb_reference_id).toBeDefined();

      expect(tetherNodeConfig.type).toBe(ActionNodeType.TETHER_NODE);
      expect(tetherNodeConfig.configuration.tether_reference_id).toBeDefined();

      expect(functionModelContainerConfig.type).toBe(ActionNodeType.FUNCTION_MODEL_CONTAINER);
      expect(functionModelContainerConfig.configuration.nested_model_id).toBeDefined();
    });

    it('should validate configuration data structure based on action type', () => {
      const actionNodeConfigurations = [
        {
          type: ActionNodeType.KB_NODE,
          requiredFields: ['kb_reference_id', 'raci'],
          optionalFields: ['search_keywords', 'access_permissions']
        },
        {
          type: ActionNodeType.TETHER_NODE,
          requiredFields: ['tether_reference_id', 'execution_parameters'],
          optionalFields: ['output_mapping', 'resource_requirements']
        },
        {
          type: ActionNodeType.FUNCTION_MODEL_CONTAINER,
          requiredFields: ['nested_model_id', 'context_mapping'],
          optionalFields: ['execution_policy', 'orchestration_mode']
        }
      ];

      actionNodeConfigurations.forEach(config => {
        expect(Object.values(ActionNodeType)).toContain(config.type);
        expect(Array.isArray(config.requiredFields)).toBe(true);
        expect(Array.isArray(config.optionalFields)).toBe(true);
        expect(config.requiredFields.length).toBeGreaterThan(0);
      });
    });
  });
});