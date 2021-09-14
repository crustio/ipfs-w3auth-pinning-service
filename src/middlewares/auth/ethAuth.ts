import {AuthData} from './types';
import * as _ from 'lodash';
import {ethers} from 'ethers';
import {logger} from '../../logger';

function auth(data: AuthData): boolean {
  const {address, signature} = data;

  logger.info('Validate as ethereum signature.');
  const signatureWithPrefix = _.startsWith(signature, '0x')
    ? signature
    : `0x${signature}`;
  return (
    compareAddresses(
      address,
      recoverMyEtherWalletSignature(address, signatureWithPrefix)
    ) ||
    compareAddresses(
      address,
      recoverMyCryptoSignature(address, signatureWithPrefix)
    )
  );
}

function recoverMyEtherWalletSignature(
  address: string,
  signature: string
): string {
  const hashBytes = ethers.utils.arrayify(address);
  const messageHash = ethers.utils.hashMessage(hashBytes);
  const messageHashBytes = ethers.utils.arrayify(messageHash);
  const publicKey = ethers.utils.recoverPublicKey(messageHashBytes, signature);
  const recoverAddress = ethers.utils.computeAddress(publicKey);
  logger.info(
    `recoverMyEtherWalletSignature recoverAddress: ${recoverAddress}`
  );
  return recoverAddress;
}

function recoverMyCryptoSignature(address: string, signature: string): string {
  const recoverAddress = ethers.utils.verifyMessage(address, signature);
  logger.info(`recoverMyCryptoSignature recoverAddress: ${recoverAddress}`);
  return recoverAddress;
}

function compareAddresses(address: string, recoverAddress: string): boolean {
  return _.toLower(_.trim(recoverAddress)) === _.toLower(_.trim(address));
}

export default {
  auth,
};
