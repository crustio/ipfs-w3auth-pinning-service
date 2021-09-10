import {AuthData} from './types';
const nacl = require('tweetnacl');
import {logger} from '../../logger';
const bs58 = require('bs58');

/**
 * SolanaAuth expects BS58 public address, and hex signature string
 */
function auth(data: AuthData): boolean {
  const {address, signature} = data;

  logger.info('Validate as solana signature.');
  return nacl.sign.detached.verify(
    new TextEncoder().encode(address),
    Uint8Array.from(Buffer.from(signature, 'hex')),
    bs58.decode(address)
  );
}

export default {
  auth,
};
