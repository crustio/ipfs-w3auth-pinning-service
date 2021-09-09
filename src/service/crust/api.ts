import {ApiPromise, WsProvider} from '@polkadot/api';
import {typesBundleForPolkadot} from '@crustio/type-definitions';
import {configs} from '../../config/config';

export const api = new ApiPromise({
  provider: new WsProvider(configs.crust.chainWsUrl),
  typesBundle: typesBundleForPolkadot,
});
