import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import type { IPasswordHasher } from '../../providers/auth/IAuthProviders';

const KEY_LENGTH = 64;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

function scrypt(value: string, salt: Buffer, cost: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(value, salt, KEY_LENGTH, {
      N: cost,
      r: BLOCK_SIZE,
      p: PARALLELIZATION,
      maxmem: 256 * cost * BLOCK_SIZE,
    }, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
}

export class ScryptPasswordHasher implements IPasswordHasher {
  constructor(private readonly cost: number) {}

  async hash(value: string): Promise<string> {
    const salt = randomBytes(16);
    const derivedKey = await scrypt(value, salt, this.cost);
    return ['scrypt', this.cost, BLOCK_SIZE, PARALLELIZATION, salt.toString('base64url'), derivedKey.toString('base64url')].join('$');
  }

  async compare(value: string, encodedHash: string): Promise<boolean> {
    const [algorithm, costText, blockSizeText, parallelizationText, saltText, hashText] = encodedHash.split('$');
    const cost = Number(costText);
    if (algorithm !== 'scrypt' || !saltText || !hashText || !Number.isInteger(cost)
      || Number(blockSizeText) !== BLOCK_SIZE || Number(parallelizationText) !== PARALLELIZATION) return false;
    const expected = Buffer.from(hashText, 'base64url');
    if (expected.length !== KEY_LENGTH) return false;
    const actual = await scrypt(value, Buffer.from(saltText, 'base64url'), cost);
    return timingSafeEqual(actual, expected);
  }
}
