import {Keyring} from '@polkadot/keyring';

const kr = new Keyring({
  type: 'sr25519',
});

// krp will be used in sending transaction
export default function (seeds: string) {
  return kr.addFromUri(seeds);
}
