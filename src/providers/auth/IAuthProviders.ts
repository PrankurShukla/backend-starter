export interface IPasswordHasher {
  hash(value: string): Promise<string>;
  compare(value: string, hash: string): Promise<boolean>;
}

export interface TokenPayload {
  subject: string;
  roles?: string[];
  tenantId?: string;
}

export interface ITokenProvider {
  createAccessToken(payload: TokenPayload): Promise<string>;
  createRefreshToken(payload: TokenPayload): Promise<string>;
  verifyAccessToken(token: string): Promise<TokenPayload>;
  verifyRefreshToken(token: string): Promise<TokenPayload>;
}
