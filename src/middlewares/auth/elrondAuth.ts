import {logger} from '../../logger';
import {AuthData} from './types';
import {Address, UserPublicKey, UserVerifier} from '@elrondnetwork/erdjs';

async function auth(data: AuthData): Promise<boolean> {
  logger.info(
    `Elrond auth address: ${data.address} txMsg: ${data.txMsg} signature: ${data.signature}`
  );
  const publicKey = new UserPublicKey(
    Address.fromString(data.address).pubkey()
  );
  const valid = publicKey.verify(
    Buffer.from(data.txMsg, 'hex'),
    Buffer.from(data.signature, 'hex')
  );
  logger.info(`Elrond auth result: ${valid}`);
  return valid;
}

export default {
  auth,
};
