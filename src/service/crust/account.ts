import {u8aToHex} from '@polkadot/util';

import {hdLedger, mnemonicGenerate} from '@polkadot/util-crypto';
import {Keyring} from '@polkadot/keyring';
type PairType = 'ecdsa' | 'ed25519' | 'ed25519-ledger' | 'ethereum' | 'sr25519';

const keyring = new Keyring();
function getSuri(seed: string, derivePath: string, pairType: PairType): string {
  return pairType === 'ed25519-ledger'
    ? u8aToHex(hdLedger(seed, derivePath).secretKey.slice(0, 32))
    : pairType === 'ethereum'
    ? `${seed}/${derivePath}`
    : `${seed}${derivePath}`;
}

export function addressFromSeed(
  seed: string,
  derivePath = '',
  pairType: PairType = 'sr25519'
): string {
  keyring.setSS58Format(66);
  return keyring.createFromUri(
    getSuri(seed, derivePath, pairType),
    {},
    pairType === 'ed25519-ledger' ? 'ed25519' : pairType
  ).address;
}

interface AddressState {
  address: string;
  seed: string;
}

export async function create(): Promise<AddressState> {
  const seed = mnemonicGenerate();
  const address = addressFromSeed(seed);
  if (!address || !seed) {
    throw new Error('Generate Error');
  }

  return {
    address,
    seed,
  };
}
