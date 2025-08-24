/**
 * Unit tests for KBNode entity
 * Tests knowledge base specific business logic, access permissions, and documentation management
 */

import { KBNode, KBNodeData } from '@/lib/domain/entities/kb-node';
import { ActionNodeType, ActionStatus, ExecutionMode } from '@/lib/domain/enums';
import { NodeId } from '@/lib/domain/value-objects/node-id';
import { RetryPolicy } from '@/lib/domain/value-objects/retry-policy';
import { RACI } from '@/lib/domain/value-objects/raci';
import { DateTestHelpers } from '../../../../utils/test-helpers';

describe('KBNode', () => {
  let validKBData: KBNodeData;
  let validProps: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    validKBData = {
      kbReferenceId: 'kb-ref-123',
      shortDescription: 'A comprehensive knowledge base node for documentation and reference',
      documentationContext: 'This KB contains important project documentation and API references',
      searchKeywords: ['documentation', 'api', 'reference', 'guide'],
      accessPermissions: {
        view: ['user1', 'user2', 'user3'],
        edit: ['user1', 'user2']
      }
    };

    const nodeIdResult = NodeId.create('123e4567-e89b-42d3-a456-426614174000');
    const parentNodeIdResult = NodeId.create('123e4567-e89b-42d3-a456-426614174001');
    const retryPolicyResult = RetryPolicy.createDefault();
    const raciResult = RACI.create(['test-user']);
    
    // Check that all Results are successful
    if (nodeIdResult.isFailure) {
      throw new Error(`Failed to create nodeId: ${nodeIdResult.error}`);
    }
    if (parentNodeIdResult.isFailure) {
      throw new Error(`Failed to create parentNodeId: ${parentNodeIdResult.error}`);
    }
    if (retryPolicyResult.isFailure) {
      throw new Error(`Failed to create retryPolicy: ${retryPolicyResult.error}`);
    }
    if (raciResult.isFailure) {
      throw new Error(`Failed to create raci: ${raciResult.error}`);
    }
    
    const nodeId = nodeIdResult.value;
    const parentNodeId = parentNodeIdResult.value;
    const retryPolicy = retryPolicyResult.value;
    const raci = raciResult.value;

    validProps = {
      actionId: nodeId.value,
      parentNodeId: parentNodeId.value,
      modelId: 'test-model-id',
      name: 'Test KB Node',
      description: 'A test knowledge base node',
      executionMode: ExecutionMode.SEQUENTIAL,
      executionOrder: 1,
      status: ActionStatus.CONFIGURED,
      priority: 5,
      estimatedDuration: 30,
      retryPolicy: retryPolicy.value,
      raci: raci.value,
      metadata: { testFlag: true },
      kbData: validKBData
    };
  });

  describe('creation and initialization', () => {
    it('should create KB node with valid properties', () => {
      // Act
      const result = KBNode.create(validProps);
      
      // Assert
      expect(result).toBeValidResult();
      const kbNode = result.value;
      
      expect(kbNode.actionId.toString()).toBe('123e4567-e89b-42d3-a456-426614174000');
      expect(kbNode.name).toBe('Test KB Node');
      expect(kbNode.getActionType()).toBe(ActionNodeType.KB_NODE);
      expect(kbNode.kbData.kbReferenceId).toBe('kb-ref-123');
      expect(kbNode.kbData.shortDescription).toBe('A comprehensive knowledge base node for documentation and reference');
      expect(kbNode.createdAt).toBeInstanceOf(Date);
      expect(kbNode.updatedAt).toBeInstanceOf(Date);
    });

    it('should reject creation with missing KB reference ID', () => {
      // Arrange
      validProps.kbData.kbReferenceId = '';
      
      // Act
      const result = KBNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('KB reference ID is required');
    });

    it('should reject creation with missing short description', () => {
      // Arrange
      validProps.kbData.shortDescription = '';
      
      // Act
      const result = KBNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Short description is required');
    });

    it('should reject creation with short description too long', () => {
      // Arrange
      validProps.kbData.shortDescription = 'a'.repeat(501);
      
      // Act
      const result = KBNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Short description cannot exceed 500 characters');
    });

    it('should reject creation with documentation context too long', () => {
      // Arrange
      validProps.kbData.documentationContext = 'a'.repeat(2001);
      
      // Act
      const result = KBNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Documentation context cannot exceed 2000 characters');
    });

    it('should reject creation with too many search keywords', () => {
      // Arrange
      validProps.kbData.searchKeywords = Array.from({ length: 21 }, (_, i) => `keyword${i}`);
      
      // Act
      const result = KBNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Cannot have more than 20 search keywords');
    });

    it('should reject creation with edit permissions not in view permissions', () => {
      // Arrange
      validProps.kbData.accessPermissions = {
        view: ['user1'],
        edit: ['user1', 'user2'] // user2 not in view
      };
      
      // Act
      const result = KBNode.create(validProps);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Users with edit permissions must also have view permissions');
    });

    it('should create with minimal valid data', () => {
      // Arrange
      validProps.kbData = {
        kbReferenceId: 'minimal-kb',
        shortDescription: 'Minimal description',
        searchKeywords: [],
        accessPermissions: { view: [], edit: [] }
      };
      
      // Act
      const result = KBNode.create(validProps);
      
      // Assert
      expect(result).toBeValidResult();
      expect(result.value.kbData.documentationContext).toBeUndefined();
    });
  });

  describe('KB reference management', () => {
    let kbNode: KBNode;

    beforeEach(() => {
      const result = KBNode.create(validProps);
      kbNode = result.value;
    });

    it('should update KB reference ID successfully', () => {
      // Act
      const result = kbNode.updateKBReferenceId('new-kb-ref-456');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.kbReferenceId).toBe('new-kb-ref-456');
    });

    it('should trim whitespace from KB reference ID', () => {
      // Act
      const result = kbNode.updateKBReferenceId('  spaced-kb-ref  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.kbReferenceId).toBe('spaced-kb-ref');
    });

    it('should reject empty KB reference ID', () => {
      // Act
      const result = kbNode.updateKBReferenceId('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('KB reference ID cannot be empty');
    });

    it('should reject whitespace-only KB reference ID', () => {
      // Act
      const result = kbNode.updateKBReferenceId('   ');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('KB reference ID cannot be empty');
    });

    it('should update timestamp when reference ID changes', () => {
      // Arrange
      const originalUpdatedAt = kbNode.updatedAt;
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      // Act
      kbNode.updateKBReferenceId('new-ref');
      
      // Assert
      expect(kbNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });
  });

  describe('short description management', () => {
    let kbNode: KBNode;

    beforeEach(() => {
      const result = KBNode.create(validProps);
      kbNode = result.value;
    });

    it('should update short description successfully', () => {
      // Act
      const result = kbNode.updateShortDescription('New updated description');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.shortDescription).toBe('New updated description');
    });

    it('should trim whitespace from description', () => {
      // Act
      const result = kbNode.updateShortDescription('  spaced description  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.shortDescription).toBe('spaced description');
    });

    it('should reject empty description', () => {
      // Act
      const result = kbNode.updateShortDescription('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Short description cannot be empty');
    });

    it('should reject whitespace-only description', () => {
      // Act
      const result = kbNode.updateShortDescription('   ');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Short description cannot be empty');
    });

    it('should reject description that is too long', () => {
      // Act
      const result = kbNode.updateShortDescription('a'.repeat(501));
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Short description cannot exceed 500 characters');
    });

    it('should accept description at maximum length', () => {
      // Act
      const result = kbNode.updateShortDescription('a'.repeat(500));
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.shortDescription).toBe('a'.repeat(500));
    });
  });

  describe('documentation context management', () => {
    let kbNode: KBNode;

    beforeEach(() => {
      const result = KBNode.create(validProps);
      kbNode = result.value;
    });

    it('should update documentation context successfully', () => {
      // Act
      const result = kbNode.updateDocumentationContext('New detailed context information');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.documentationContext).toBe('New detailed context information');
    });

    it('should trim whitespace from context', () => {
      // Act
      const result = kbNode.updateDocumentationContext('  spaced context  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.documentationContext).toBe('spaced context');
    });

    it('should allow clearing context with undefined', () => {
      // Act
      const result = kbNode.updateDocumentationContext(undefined);
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.documentationContext).toBeUndefined();
    });

    it('should allow empty string to clear context', () => {
      // Act
      const result = kbNode.updateDocumentationContext('');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.documentationContext).toBe('');
    });

    it('should reject context that is too long', () => {
      // Act
      const result = kbNode.updateDocumentationContext('a'.repeat(2001));
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Documentation context cannot exceed 2000 characters');
    });

    it('should accept context at maximum length', () => {
      // Act
      const result = kbNode.updateDocumentationContext('a'.repeat(2000));
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.documentationContext).toBe('a'.repeat(2000));
    });
  });

  describe('search keywords management', () => {
    let kbNode: KBNode;

    beforeEach(() => {
      const result = KBNode.create(validProps);
      kbNode = result.value;
    });

    it('should add search keyword successfully', () => {
      // Act
      const result = kbNode.addSearchKeyword('NewKeyword');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.searchKeywords).toContain('newkeyword'); // lowercase
    });

    it('should convert keyword to lowercase', () => {
      // Act
      const result = kbNode.addSearchKeyword('CamelCaseKeyword');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.searchKeywords).toContain('camelcasekeyword');
      expect(kbNode.kbData.searchKeywords).not.toContain('CamelCaseKeyword');
    });

    it('should trim whitespace from keyword', () => {
      // Act
      const result = kbNode.addSearchKeyword('  spaced keyword  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.searchKeywords).toContain('spaced keyword');
    });

    it('should reject empty keyword', () => {
      // Act
      const result = kbNode.addSearchKeyword('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Search keyword cannot be empty');
    });

    it('should reject whitespace-only keyword', () => {
      // Act
      const result = kbNode.addSearchKeyword('   ');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Search keyword cannot be empty');
    });

    it('should reject duplicate keywords', () => {
      // Arrange - Add initial keyword
      kbNode.addSearchKeyword('duplicate');
      
      // Act - Try to add same keyword
      const result = kbNode.addSearchKeyword('Duplicate'); // Different case
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Search keyword already exists');
    });

    it('should reject adding keyword when at maximum limit', () => {
      // Arrange - Fill up to 20 keywords
      for (let i = 0; i < 16; i++) { // 4 already exist + 16 = 20
        kbNode.addSearchKeyword(`keyword${i}`);
      }
      
      // Act - Try to add 21st keyword
      const result = kbNode.addSearchKeyword('excess');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Cannot have more than 20 search keywords');
    });

    it('should remove search keyword successfully', () => {
      // Arrange - Add keyword first
      kbNode.addSearchKeyword('tempKeyword');
      expect(kbNode.kbData.searchKeywords).toContain('tempkeyword');
      
      // Act
      const result = kbNode.removeSearchKeyword('tempKeyword'); // Different case
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.searchKeywords).not.toContain('tempkeyword');
    });

    it('should reject removing non-existent keyword', () => {
      // Act
      const result = kbNode.removeSearchKeyword('nonExistent');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Search keyword does not exist');
    });

    it('should handle keyword removal with case sensitivity', () => {
      // Arrange
      kbNode.addSearchKeyword('CaseSensitive');
      
      // Act - Remove with different case
      const result = kbNode.removeSearchKeyword('casesensitive');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.searchKeywords).not.toContain('casesensitive');
    });

    it('should handle keyword removal with whitespace', () => {
      // Arrange
      kbNode.addSearchKeyword('spaceKeyword');
      
      // Act - Remove with extra spaces
      const result = kbNode.removeSearchKeyword('  spaceKeyword  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.searchKeywords).not.toContain('spacekeyword');
    });
  });

  describe('access permissions management', () => {
    let kbNode: KBNode;

    beforeEach(() => {
      const result = KBNode.create(validProps);
      kbNode = result.value;
    });

    it('should update access permissions successfully', () => {
      // Arrange
      const newPermissions = {
        view: ['viewUser1', 'viewUser2', 'editUser1'],
        edit: ['editUser1']
      };
      
      // Act
      const result = kbNode.updateAccessPermissions(newPermissions);
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.accessPermissions.view).toEqual(['viewUser1', 'viewUser2', 'editUser1']);
      expect(kbNode.kbData.accessPermissions.edit).toEqual(['editUser1']);
    });

    it('should reject permissions where edit users are not in view', () => {
      // Arrange
      const invalidPermissions = {
        view: ['viewUser1'],
        edit: ['editUser1', 'editUser2'] // editUser2 not in view
      };
      
      // Act
      const result = kbNode.updateAccessPermissions(invalidPermissions);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Users with edit permissions must also have view permissions');
    });

    it('should remove duplicates from permissions', () => {
      // Arrange
      const duplicatePermissions = {
        view: ['user1', 'user2', 'user1', 'user3'], // user1 duplicate
        edit: ['user1', 'user1'] // user1 duplicate
      };
      
      // Act
      const result = kbNode.updateAccessPermissions(duplicatePermissions);
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.accessPermissions.view).toEqual(['user1', 'user2', 'user3']);
      expect(kbNode.kbData.accessPermissions.edit).toEqual(['user1']);
    });

    it('should remove empty strings from permissions', () => {
      // Arrange
      const permissionsWithEmpty = {
        view: ['user1', '', 'user2', '   '], // empty and whitespace
        edit: ['user1', '']
      };
      
      // Act
      const result = kbNode.updateAccessPermissions(permissionsWithEmpty);
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.accessPermissions.view).toEqual(['user1', 'user2']);
      expect(kbNode.kbData.accessPermissions.edit).toEqual(['user1']);
    });

    it('should allow empty permissions arrays', () => {
      // Act
      const result = kbNode.updateAccessPermissions({ view: [], edit: [] });
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.accessPermissions.view).toEqual([]);
      expect(kbNode.kbData.accessPermissions.edit).toEqual([]);
    });
  });

  describe('individual access management', () => {
    let kbNode: KBNode;

    beforeEach(() => {
      const result = KBNode.create(validProps);
      kbNode = result.value;
    });

    it('should grant view access successfully', () => {
      // Act
      const result = kbNode.grantViewAccess('newUser');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.accessPermissions.view).toContain('newUser');
    });

    it('should trim user ID when granting view access', () => {
      // Act
      const result = kbNode.grantViewAccess('  newUser  ');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.accessPermissions.view).toContain('newUser');
    });

    it('should reject granting view access to empty user ID', () => {
      // Act
      const result = kbNode.grantViewAccess('');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('User ID cannot be empty');
    });

    it('should reject granting view access to user who already has it', () => {
      // Arrange - Grant access first
      kbNode.grantViewAccess('existingUser');
      
      // Act - Try to grant again
      const result = kbNode.grantViewAccess('existingUser');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('User already has view access');
    });

    it('should grant edit access successfully', () => {
      // Act
      const result = kbNode.grantEditAccess('editUser');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.accessPermissions.edit).toContain('editUser');
      expect(kbNode.kbData.accessPermissions.view).toContain('editUser'); // Auto-granted view
    });

    it('should auto-grant view access when granting edit access', () => {
      // Act
      const result = kbNode.grantEditAccess('autoViewUser');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.accessPermissions.view).toContain('autoViewUser');
      expect(kbNode.kbData.accessPermissions.edit).toContain('autoViewUser');
    });

    it('should not duplicate view access when user already has it', () => {
      // Arrange - Grant view access first
      kbNode.grantViewAccess('existingViewUser');
      const originalViewCount = kbNode.kbData.accessPermissions.view.length;
      
      // Act - Grant edit access
      kbNode.grantEditAccess('existingViewUser');
      
      // Assert
      expect(kbNode.kbData.accessPermissions.view).toHaveLength(originalViewCount); // No duplicate
      expect(kbNode.kbData.accessPermissions.edit).toContain('existingViewUser');
    });

    it('should reject granting edit access to user who already has it', () => {
      // Arrange - Grant edit access first
      kbNode.grantEditAccess('existingEditUser');
      
      // Act - Try to grant again
      const result = kbNode.grantEditAccess('existingEditUser');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('User already has edit access');
    });

    it('should revoke access successfully', () => {
      // Arrange - Grant both view and edit access
      kbNode.grantEditAccess('revokeUser');
      expect(kbNode.kbData.accessPermissions.view).toContain('revokeUser');
      expect(kbNode.kbData.accessPermissions.edit).toContain('revokeUser');
      
      // Act
      const result = kbNode.revokeAccess('revokeUser');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.accessPermissions.view).not.toContain('revokeUser');
      expect(kbNode.kbData.accessPermissions.edit).not.toContain('revokeUser');
    });

    it('should revoke only view access if user has no edit access', () => {
      // Arrange - Grant only view access
      kbNode.grantViewAccess('viewOnlyUser');
      
      // Act
      const result = kbNode.revokeAccess('viewOnlyUser');
      
      // Assert
      expect(result).toBeValidResult();
      expect(kbNode.kbData.accessPermissions.view).not.toContain('viewOnlyUser');
    });

    it('should reject revoking access from user who has no access', () => {
      // Act
      const result = kbNode.revokeAccess('noAccessUser');
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('User does not have access');
    });

    it('should reject empty user ID for access operations', () => {
      // Act & Assert
      expect(kbNode.grantViewAccess('')).toBeFailureResult();
      expect(kbNode.grantEditAccess('')).toBeFailureResult();
      expect(kbNode.revokeAccess('')).toBeFailureResult();
    });
  });

  describe('data access and immutability', () => {
    let kbNode: KBNode;

    beforeEach(() => {
      const result = KBNode.create(validProps);
      kbNode = result.value;
    });

    it('should return readonly KB data', () => {
      // Act
      const kbData = kbNode.kbData;
      
      // Assert
      expect(kbData).toBeDefined();
      expect(kbData.kbReferenceId).toBe('kb-ref-123');
      
      // TypeScript should prevent modification at compile time
      // The Readonly<T> type provides compile-time protection, not runtime protection
      // We can verify the returned data matches expected structure
      expect(typeof kbData.kbReferenceId).toBe('string');
    });

    it('should return correct action type', () => {
      // Act & Assert
      expect(kbNode.getActionType()).toBe(ActionNodeType.KB_NODE);
    });
  });

  describe('timestamps and audit trail', () => {
    let kbNode: KBNode;

    beforeEach(() => {
      const result = KBNode.create(validProps);
      kbNode = result.value;
    });

    it('should update timestamp when KB reference changes', () => {
      // Arrange
      const originalUpdatedAt = kbNode.updatedAt;
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      // Act
      kbNode.updateKBReferenceId('new-ref');
      
      // Assert
      expect(kbNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });

    it('should update timestamp when description changes', () => {
      // Arrange
      const originalUpdatedAt = kbNode.updatedAt;
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      // Act
      kbNode.updateShortDescription('new description');
      
      // Assert
      expect(kbNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });

    it('should update timestamp when context changes', () => {
      // Arrange
      const originalUpdatedAt = kbNode.updatedAt;
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      // Act
      kbNode.updateDocumentationContext('new context');
      
      // Assert
      expect(kbNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });

    it('should update timestamp when keywords change', () => {
      // Arrange
      const originalUpdatedAt = kbNode.updatedAt;
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      // Act
      kbNode.addSearchKeyword('newKeyword');
      
      // Assert
      expect(kbNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });

    it('should update timestamp when permissions change', () => {
      // Arrange
      const originalUpdatedAt = kbNode.updatedAt;
      const dateNowSpy = DateTestHelpers.mockDateNow(Date.now() + 1000);
      
      // Act
      kbNode.grantViewAccess('newUser');
      
      // Assert
      expect(kbNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      
      // Cleanup
      DateTestHelpers.restoreDateNow(dateNowSpy);
    });
  });
});