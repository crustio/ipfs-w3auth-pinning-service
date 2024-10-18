import {ApiPromise, ApiRx, WsProvider} from '@polkadot/api';
import {typesBundleForPolkadot} from '@crustio/type-definitions';
import {configs} from '../../config/config';

export const apiConnect = (): ApiPromise => {
  return new ApiPromise({
    provider: new WsProvider(configs.crust.chainWsUrl),
    typesBundle: typesBundleForPolkadot,
  });
}

export const disconnectApi = async (api: ApiPromise) => {
  if (api) {
    await api.disconnect().catch((e) => {});
  }
}
