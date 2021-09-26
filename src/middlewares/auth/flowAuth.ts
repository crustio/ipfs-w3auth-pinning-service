import {logger} from '../../logger';
import {AuthData} from './types';
const fcl = require('@onflow/fcl');

async function auth(data: AuthData): Promise<boolean> {
  logger.info('Validate as flow signature');
  const {address, signature} = data;
  const newSignature = Buffer.from(signature, 'base64').toString('ascii');
  logger.info(`address: ${address}, signature: ${newSignature}`);
  // TODO: use main net
  fcl.config().put('accessNode.api', 'https://access-testnet.onflow.org'); // Configure FCL's Access Node
  const sign = JSON.parse(newSignature);
  const MSG = Buffer.from(address).toString('hex');
  const result = await fcl.verifyUserSignatures(MSG, sign);
  logger.info(`Flow signature verify result: ${result}`);
  return result;
}

export default {
  auth,
};
