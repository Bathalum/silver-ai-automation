/**
 * Unit tests for RACI value object
 * Tests responsibility assignment matrix validation, role management, and business rules
 */

import { RACI } from '@/lib/domain/value-objects/raci';
import { RACIRole } from '@/lib/domain/enums';

describe('RACI', () => {
  describe('creation and validation', () => {
    it('should create RACI with valid roles', () => {
      // Act
      const result = RACI.create(
        ['John', 'Jane'],     // responsible
        ['Manager'],          // accountable
        ['Advisor'],          // consulted
        ['Team']              // informed
      );
      
      // Assert
      expect(result).toBeValidResult();
      const raci = result.value;
      expect(raci.responsible).toEqual(['John', 'Jane']);
      expect(raci.accountable).toEqual(['Manager']);
      expect(raci.consulted).toEqual(['Advisor']);
      expect(raci.informed).toEqual(['Team']);
    });

    it('should create RACI with only responsible parties', () => {
      // Act
      const result = RACI.create(['Developer']);
      
      // Assert
      expect(result).toBeValidResult();
      const raci = result.value;
      expect(raci.responsible).toEqual(['Developer']);
      expect(raci.accountable).toEqual([]);
      expect(raci.consulted).toEqual([]);
      expect(raci.informed).toEqual([]);
    });

    it('should create RACI with multiple parties in same role', () => {
      // Act
      const result = RACI.create(
        ['Dev1', 'Dev2', 'Dev3'], // multiple responsible
        ['PM1', 'PM2'],           // multiple accountable
        [],
        []
      );
      
      // Assert
      expect(result).toBeValidResult();
      const raci = result.value;
      expect(raci.responsible).toEqual(['Dev1', 'Dev2', 'Dev3']);
      expect(raci.accountable).toEqual(['PM1', 'PM2']);
    });

    it('should reject RACI with no responsible parties', () => {
      // Act
      const result = RACI.create(
        [],           // empty responsible
        ['Manager'],
        ['Advisor'],
        ['Team']
      );
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('RACI must have at least one responsible party');
    });

    it('should reject RACI with duplicate parties across roles', () => {
      // Act
      const result = RACI.create(
        ['John'],     // responsible
        ['John'],     // also accountable - duplicate
        [],
        []
      );
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('The same party cannot have multiple roles in RACI matrix');
    });

    it('should reject RACI with duplicate parties within same role', () => {
      // Act
      const result = RACI.create(
        ['John', 'John'], // duplicate within responsible
        [],
        [],
        []
      );
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('The same party cannot have multiple roles in RACI matrix');
    });

    it('should reject RACI with empty party name', () => {
      // Act
      const result = RACI.create(
        ['John', ''],  // empty string
        [],
        [],
        []
      );
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Party names cannot be empty');
    });

    it('should reject RACI with whitespace-only party name', () => {
      // Act
      const result = RACI.create(
        ['John', '   '], // whitespace only
        [],
        [],
        []
      );
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Party names cannot be empty');
    });

    it('should detect duplicates across different roles', () => {
      // Act
      const result = RACI.create(
        ['Alice'],
        ['Bob'],
        ['Charlie'],
        ['Alice']  // Alice appears in both responsible and informed
      );
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('The same party cannot have multiple roles in RACI matrix');
    });
  });

  describe('factory methods', () => {
    it('should create empty RACI with system as responsible', () => {
      // Act
      const raci = RACI.empty();
      
      // Assert
      expect(raci.responsible).toEqual(['System']);
      expect(raci.accountable).toEqual([]);
      expect(raci.consulted).toEqual([]);
      expect(raci.informed).toEqual([]);
    });

    it('should always return same empty structure', () => {
      // Act
      const raci1 = RACI.empty();
      const raci2 = RACI.empty();
      
      // Assert
      expect(raci1.equals(raci2)).toBe(true);
    });
  });

  describe('role checking', () => {
    let raci: RACI;

    beforeEach(() => {
      raci = RACI.create(
        ['John', 'Jane'],
        ['Manager'],
        ['Advisor', 'Consultant'],
        ['Team', 'Stakeholder']
      ).value;
    });

    it('should correctly identify responsible parties', () => {
      // Act & Assert
      expect(raci.hasRole('John', RACIRole.RESPONSIBLE)).toBe(true);
      expect(raci.hasRole('Jane', RACIRole.RESPONSIBLE)).toBe(true);
      expect(raci.hasRole('Manager', RACIRole.RESPONSIBLE)).toBe(false);
    });

    it('should correctly identify accountable parties', () => {
      // Act & Assert
      expect(raci.hasRole('Manager', RACIRole.ACCOUNTABLE)).toBe(true);
      expect(raci.hasRole('John', RACIRole.ACCOUNTABLE)).toBe(false);
    });

    it('should correctly identify consulted parties', () => {
      // Act & Assert
      expect(raci.hasRole('Advisor', RACIRole.CONSULTED)).toBe(true);
      expect(raci.hasRole('Consultant', RACIRole.CONSULTED)).toBe(true);
      expect(raci.hasRole('Team', RACIRole.CONSULTED)).toBe(false);
    });

    it('should correctly identify informed parties', () => {
      // Act & Assert
      expect(raci.hasRole('Team', RACIRole.INFORMED)).toBe(true);
      expect(raci.hasRole('Stakeholder', RACIRole.INFORMED)).toBe(true);
      expect(raci.hasRole('John', RACIRole.INFORMED)).toBe(false);
    });

    it('should return false for non-existent party', () => {
      // Act & Assert
      expect(raci.hasRole('NonExistent', RACIRole.RESPONSIBLE)).toBe(false);
      expect(raci.hasRole('NonExistent', RACIRole.ACCOUNTABLE)).toBe(false);
      expect(raci.hasRole('NonExistent', RACIRole.CONSULTED)).toBe(false);
      expect(raci.hasRole('NonExistent', RACIRole.INFORMED)).toBe(false);
    });

    it('should handle case-sensitive party names', () => {
      // Act & Assert
      expect(raci.hasRole('john', RACIRole.RESPONSIBLE)).toBe(false); // lowercase
      expect(raci.hasRole('JOHN', RACIRole.RESPONSIBLE)).toBe(false); // uppercase
    });
  });

  describe('role retrieval', () => {
    let raci: RACI;

    beforeEach(() => {
      raci = RACI.create(
        ['Dev1', 'Dev2'],
        ['PM'],
        ['Architect'],
        ['QA', 'Designer']
      ).value;
    });

    it('should return parties for responsible role', () => {
      // Act
      const parties = raci.getPartiesForRole(RACIRole.RESPONSIBLE);
      
      // Assert
      expect(parties).toEqual(['Dev1', 'Dev2']);
    });

    it('should return parties for accountable role', () => {
      // Act
      const parties = raci.getPartiesForRole(RACIRole.ACCOUNTABLE);
      
      // Assert
      expect(parties).toEqual(['PM']);
    });

    it('should return parties for consulted role', () => {
      // Act
      const parties = raci.getPartiesForRole(RACIRole.CONSULTED);
      
      // Assert
      expect(parties).toEqual(['Architect']);
    });

    it('should return parties for informed role', () => {
      // Act
      const parties = raci.getPartiesForRole(RACIRole.INFORMED);
      
      // Assert
      expect(parties).toEqual(['QA', 'Designer']);
    });

    it('should return readonly arrays', () => {
      // Act
      const parties = raci.getPartiesForRole(RACIRole.RESPONSIBLE);
      
      // Assert
      expect(() => {
        (parties as any).push('NewDev');
      }).toThrow();
    });

    it('should return empty array for invalid role', () => {
      // Act
      const parties = raci.getPartiesForRole('INVALID' as any);
      
      // Assert
      expect(parties).toEqual([]);
    });
  });

  describe('party management', () => {
    let raci: RACI;

    beforeEach(() => {
      raci = RACI.create(['John'], ['Manager']).value;
    });

    it('should get all parties across roles', () => {
      // Act
      const allParties = raci.getAllParties();
      
      // Assert
      expect(allParties).toEqual(['John', 'Manager']);
    });

    it('should return defensive copy of all parties', () => {
      // Act
      const allParties = raci.getAllParties();
      allParties.push('NewParty');
      
      // Assert
      expect(raci.getAllParties()).toEqual(['John', 'Manager']); // unchanged
    });

    it('should add party to responsible role', () => {
      // Act
      const result = raci.addParty('NewDev', RACIRole.RESPONSIBLE);
      
      // Assert
      expect(result).toBeValidResult();
      const newRaci = result.value;
      expect(newRaci.responsible).toEqual(['John', 'NewDev']);
      expect(newRaci.accountable).toEqual(['Manager']);
    });

    it('should add party to accountable role', () => {
      // Act
      const result = raci.addParty('SeniorManager', RACIRole.ACCOUNTABLE);
      
      // Assert
      expect(result).toBeValidResult();
      const newRaci = result.value;
      expect(newRaci.accountable).toEqual(['Manager', 'SeniorManager']);
    });

    it('should add party to consulted role', () => {
      // Act
      const result = raci.addParty('Consultant', RACIRole.CONSULTED);
      
      // Assert
      expect(result).toBeValidResult();
      const newRaci = result.value;
      expect(newRaci.consulted).toEqual(['Consultant']);
    });

    it('should add party to informed role', () => {
      // Act
      const result = raci.addParty('Stakeholder', RACIRole.INFORMED);
      
      // Assert
      expect(result).toBeValidResult();
      const newRaci = result.value;
      expect(newRaci.informed).toEqual(['Stakeholder']);
    });

    it('should trim whitespace when adding party', () => {
      // Act
      const result = raci.addParty('  NewDev  ', RACIRole.RESPONSIBLE);
      
      // Assert
      expect(result).toBeValidResult();
      const newRaci = result.value;
      expect(newRaci.responsible).toContain('NewDev');
    });

    it('should reject adding empty party name', () => {
      // Act
      const result = raci.addParty('', RACIRole.RESPONSIBLE);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Party name cannot be empty');
    });

    it('should reject adding whitespace-only party name', () => {
      // Act
      const result = raci.addParty('   ', RACIRole.RESPONSIBLE);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Party name cannot be empty');
    });

    it('should reject adding party that already exists', () => {
      // Act
      const result = raci.addParty('John', RACIRole.ACCOUNTABLE);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Party already has a role in RACI matrix');
    });

    it('should reject adding party that exists in different role', () => {
      // Act
      const result = raci.addParty('Manager', RACIRole.RESPONSIBLE);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Party already has a role in RACI matrix');
    });

    it('should not modify original RACI when adding party', () => {
      // Act
      raci.addParty('NewDev', RACIRole.RESPONSIBLE);
      
      // Assert
      expect(raci.responsible).toEqual(['John']); // unchanged
    });
  });

  describe('equality and comparison', () => {
    it('should be equal when all roles match exactly', () => {
      // Arrange
      const raci1 = RACI.create(['John'], ['Manager'], ['Advisor'], ['Team']).value;
      const raci2 = RACI.create(['John'], ['Manager'], ['Advisor'], ['Team']).value;
      
      // Act & Assert
      expect(raci1.equals(raci2)).toBe(true);
    });

    it('should be equal when parties are in different order', () => {
      // Arrange
      const raci1 = RACI.create(['John', 'Jane'], ['PM'], [], []).value;
      const raci2 = RACI.create(['Jane', 'John'], ['PM'], [], []).value;
      
      // Act & Assert
      expect(raci1.equals(raci2)).toBe(true);
    });

    it('should not be equal when responsible parties differ', () => {
      // Arrange
      const raci1 = RACI.create(['John'], ['Manager'], [], []).value;
      const raci2 = RACI.create(['Jane'], ['Manager'], [], []).value;
      
      // Act & Assert
      expect(raci1.equals(raci2)).toBe(false);
    });

    it('should not be equal when accountable parties differ', () => {
      // Arrange
      const raci1 = RACI.create(['John'], ['Manager1'], [], []).value;
      const raci2 = RACI.create(['John'], ['Manager2'], [], []).value;
      
      // Act & Assert
      expect(raci1.equals(raci2)).toBe(false);
    });

    it('should not be equal when consulted parties differ', () => {
      // Arrange
      const raci1 = RACI.create(['John'], [], ['Advisor1'], []).value;
      const raci2 = RACI.create(['John'], [], ['Advisor2'], []).value;
      
      // Act & Assert
      expect(raci1.equals(raci2)).toBe(false);
    });

    it('should not be equal when informed parties differ', () => {
      // Arrange
      const raci1 = RACI.create(['John'], [], [], ['Team1']).value;
      const raci2 = RACI.create(['John'], [], [], ['Team2']).value;
      
      // Act & Assert
      expect(raci1.equals(raci2)).toBe(false);
    });

    it('should not be equal when number of parties differs', () => {
      // Arrange
      const raci1 = RACI.create(['John'], [], [], []).value;
      const raci2 = RACI.create(['John', 'Jane'], [], [], []).value;
      
      // Act & Assert
      expect(raci1.equals(raci2)).toBe(false);
    });

    it('should be equal with empty roles', () => {
      // Arrange
      const raci1 = RACI.create(['John'], [], [], []).value;
      const raci2 = RACI.create(['John'], [], [], []).value;
      
      // Act & Assert
      expect(raci1.equals(raci2)).toBe(true);
    });

    it('should handle comparison with complex multi-role setup', () => {
      // Arrange
      const raci1 = RACI.create(
        ['Dev1', 'Dev2'],
        ['PM1', 'PM2'],
        ['Arch1', 'Arch2'],
        ['QA1', 'QA2']
      ).value;
      
      const raci2 = RACI.create(
        ['Dev2', 'Dev1'], // different order
        ['PM2', 'PM1'],   // different order
        ['Arch2', 'Arch1'], // different order
        ['QA2', 'QA1']   // different order
      ).value;
      
      // Act & Assert
      expect(raci1.equals(raci2)).toBe(true);
    });
  });

  describe('object conversion', () => {
    it('should convert to object with all role arrays', () => {
      // Arrange
      const raci = RACI.create(
        ['Dev1', 'Dev2'],
        ['Manager'],
        ['Architect'],
        ['QA', 'Designer']
      ).value;
      
      // Act
      const obj = raci.toObject();
      
      // Assert
      expect(obj).toEqual({
        responsible: ['Dev1', 'Dev2'],
        accountable: ['Manager'],
        consulted: ['Architect'],
        informed: ['QA', 'Designer']
      });
    });

    it('should convert with empty roles', () => {
      // Arrange
      const raci = RACI.create(['Developer']).value;
      
      // Act
      const obj = raci.toObject();
      
      // Assert
      expect(obj).toEqual({
        responsible: ['Developer'],
        accountable: [],
        consulted: [],
        informed: []
      });
    });

    it('should create independent arrays in object', () => {
      // Arrange
      const raci = RACI.create(['Developer'], ['Manager']).value;
      
      // Act
      const obj = raci.toObject();
      obj.responsible.push('NewDev');
      obj.accountable.push('NewManager');
      
      // Assert
      expect(raci.responsible).toEqual(['Developer']); // unchanged
      expect(raci.accountable).toEqual(['Manager']); // unchanged
    });

    it('should work with JSON serialization', () => {
      // Arrange
      const raci = RACI.create(['John'], ['Manager']).value;
      const wrapper = { raci: raci.toObject() };
      
      // Act
      const json = JSON.stringify(wrapper);
      
      // Assert
      expect(json).toBe('{"raci":{"responsible":["John"],"accountable":["Manager"],"consulted":[],"informed":[]}}');
    });
  });

  describe('immutability', () => {
    let raci: RACI;

    beforeEach(() => {
      raci = RACI.create(['John'], ['Manager'], ['Advisor'], ['Team']).value;
    });

    it('should have readonly role arrays', () => {
      // Act & Assert
      expect(() => {
        (raci.responsible as any).push('NewDev');
      }).toThrow();
      
      expect(() => {
        (raci.accountable as any).push('NewManager');
      }).toThrow();
      
      expect(() => {
        (raci.consulted as any).push('NewAdvisor');
      }).toThrow();
      
      expect(() => {
        (raci.informed as any).push('NewTeam');
      }).toThrow();
    });

    it('should not allow modification of internal arrays', () => {
      // Act & Assert
      expect(() => {
        (raci as any)._responsible.push('NewDev');
      }).toThrow();
    });

    it('should return new instance when adding party', () => {
      // Act
      const newRaci = raci.addParty('NewDev', RACIRole.RESPONSIBLE).value;
      
      // Assert
      expect(newRaci).not.toBe(raci);
      expect(raci.responsible).toEqual(['John']); // original unchanged
      expect(newRaci.responsible).toEqual(['John', 'NewDev']); // new instance updated
    });
  });

  describe('edge cases and validation', () => {
    it('should handle single character party names', () => {
      // Act
      const result = RACI.create(['A'], ['B'], ['C'], ['D']);
      
      // Assert
      expect(result).toBeValidResult();
    });

    it('should handle very long party names', () => {
      // Arrange
      const longName = 'A'.repeat(1000);
      
      // Act
      const result = RACI.create([longName]);
      
      // Assert
      expect(result).toBeValidResult();
    });

    it('should handle special characters in party names', () => {
      // Act
      const result = RACI.create(['John-Doe'], ['Jane_Smith'], ['Bob@Company'], ['Team#1']);
      
      // Assert
      expect(result).toBeValidResult();
    });

    it('should handle unicode characters in party names', () => {
      // Act
      const result = RACI.create(['João'], ['Müller'], ['张三'], ['🙋‍♂️']);
      
      // Assert
      expect(result).toBeValidResult();
    });

    it('should detect duplicates case-sensitively', () => {
      // Act
      const result = RACI.create(['John', 'john']); // Different cases
      
      // Assert
      expect(result).toBeValidResult(); // Should be allowed (case-sensitive)
      expect(result.value.responsible).toEqual(['John', 'john']);
    });

    it('should handle null values gracefully', () => {
      // Act & Assert
      expect(() => {
        RACI.create(null as any);
      }).toThrow();
    });

    it('should handle undefined values gracefully', () => {
      // Act & Assert
      expect(() => {
        RACI.create(undefined as any);
      }).toThrow();
    });
  });

  describe('business rule validation', () => {
    it('should enforce that responsible role cannot be empty in any operation', () => {
      // This is enforced by the create method requiring at least one responsible party
      // and addParty method not allowing removal of parties
      
      // Act
      const result = RACI.create([]);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('RACI must have at least one responsible party');
    });

    it('should maintain RACI principle of unique party-role assignment', () => {
      // Arrange
      const raci = RACI.create(['John'], ['Manager']).value;
      
      // Act - Try to add John to another role
      const result = raci.addParty('John', RACIRole.ACCOUNTABLE);
      
      // Assert
      expect(result).toBeFailureResult();
      expect(result).toHaveErrorMessage('Party already has a role in RACI matrix');
    });

    it('should allow same name in different RACI instances', () => {
      // Act
      const raci1 = RACI.create(['John']).value;
      const raci2 = RACI.create(['John']).value;
      
      // Assert
      expect(raci1.hasRole('John', RACIRole.RESPONSIBLE)).toBe(true);
      expect(raci2.hasRole('John', RACIRole.RESPONSIBLE)).toBe(true);
    });
  });
});