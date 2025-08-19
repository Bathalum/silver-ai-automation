import { Result } from '../shared/result';
import { RACIRole } from '../enums';

export class RACI {
  private constructor(
    private readonly _responsible: string[],
    private readonly _accountable: string[],
    private readonly _consulted: string[],
    private readonly _informed: string[]
  ) {}

  public get responsible(): readonly string[] {
    return this._responsible;
  }

  public get accountable(): readonly string[] {
    return this._accountable;
  }

  public get consulted(): readonly string[] {
    return this._consulted;
  }

  public get informed(): readonly string[] {
    return this._informed;
  }

  public static create(
    responsible: string[] = [],
    accountable: string[] = [],
    consulted: string[] = [],
    informed: string[] = []
  ): Result<RACI> {
    if (responsible.length === 0) {
      return Result.fail<RACI>('RACI must have at least one responsible party');
    }

    // Validate no duplicates across roles
    const allParties = [...responsible, ...accountable, ...consulted, ...informed];
    const uniqueParties = new Set(allParties);
    if (allParties.length !== uniqueParties.size) {
      return Result.fail<RACI>('The same party cannot have multiple roles in RACI matrix');
    }

    // Validate party names are not empty
    const emptyParties = allParties.filter(party => !party || party.trim().length === 0);
    if (emptyParties.length > 0) {
      return Result.fail<RACI>('Party names cannot be empty');
    }

    return Result.ok<RACI>(new RACI(
      [...responsible],
      [...accountable], 
      [...consulted],
      [...informed]
    ));
  }

  public static empty(): RACI {
    return new RACI(['System'], [], [], []);
  }

  public hasRole(party: string, role: RACIRole): boolean {
    switch (role) {
      case RACIRole.RESPONSIBLE:
        return this._responsible.includes(party);
      case RACIRole.ACCOUNTABLE:
        return this._accountable.includes(party);
      case RACIRole.CONSULTED:
        return this._consulted.includes(party);
      case RACIRole.INFORMED:
        return this._informed.includes(party);
      default:
        return false;
    }
  }

  public getPartiesForRole(role: RACIRole): readonly string[] {
    switch (role) {
      case RACIRole.RESPONSIBLE:
        return this._responsible;
      case RACIRole.ACCOUNTABLE:
        return this._accountable;
      case RACIRole.CONSULTED:
        return this._consulted;
      case RACIRole.INFORMED:
        return this._informed;
      default:
        return [];
    }
  }

  public getAllParties(): string[] {
    return [...this._responsible, ...this._accountable, ...this._consulted, ...this._informed];
  }

  public addParty(party: string, role: RACIRole): Result<RACI> {
    if (!party || party.trim().length === 0) {
      return Result.fail<RACI>('Party name cannot be empty');
    }

    const trimmedParty = party.trim();
    
    // Check if party already has any role
    if (this.getAllParties().includes(trimmedParty)) {
      return Result.fail<RACI>('Party already has a role in RACI matrix');
    }

    const newResponsible = [...this._responsible];
    const newAccountable = [...this._accountable];
    const newConsulted = [...this._consulted];
    const newInformed = [...this._informed];

    switch (role) {
      case RACIRole.RESPONSIBLE:
        newResponsible.push(trimmedParty);
        break;
      case RACIRole.ACCOUNTABLE:
        newAccountable.push(trimmedParty);
        break;
      case RACIRole.CONSULTED:
        newConsulted.push(trimmedParty);
        break;
      case RACIRole.INFORMED:
        newInformed.push(trimmedParty);
        break;
    }

    return Result.ok<RACI>(new RACI(newResponsible, newAccountable, newConsulted, newInformed));
  }

  public equals(other: RACI): boolean {
    const compareArrays = (a: readonly string[], b: readonly string[]) => {
      if (a.length !== b.length) return false;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((val, i) => val === sortedB[i]);
    };

    return (
      compareArrays(this._responsible, other._responsible) &&
      compareArrays(this._accountable, other._accountable) &&
      compareArrays(this._consulted, other._consulted) &&
      compareArrays(this._informed, other._informed)
    );
  }

  public toObject(): {
    responsible: string[];
    accountable: string[];
    consulted: string[];
    informed: string[];
  } {
    return {
      responsible: [...this._responsible],
      accountable: [...this._accountable],
      consulted: [...this._consulted],
      informed: [...this._informed],
    };
  }
}