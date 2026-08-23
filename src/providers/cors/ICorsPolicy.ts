export interface ICorsPolicy {
  isAllowed(origin: string): boolean | Promise<boolean>;
}

export class AllowListCorsPolicy implements ICorsPolicy {
  private readonly origins: Set<string>;

  constructor(origins: string[]) {
    this.origins = new Set(origins.map(origin => origin.replace(/\/$/, '')));
  }

  isAllowed(origin: string): boolean {
    return this.origins.has(origin.replace(/\/$/, ''));
  }
}
