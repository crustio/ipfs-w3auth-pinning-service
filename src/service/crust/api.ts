import {typesBundleForPolkadot} from '@crustio/type-definitions';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {configs} from '../../config/config';

let apiPromise: ApiPromise = undefined;
export const apiConnect = async () => {
  if (!apiPromise) {
    const provider = new WsProvider(configs.crust.chainWsUrl, 1000);
    provider.on('error', error => {
      console.info('ApiWsProvider:Error:', error);
    });
    provider.on('disconnected', v => {
      console.info('ApiWsProvider:Disconnected', v);
    });
    provider.on('connected', v => {
      console.info('ApiWsProvider:Connected', v);
    });
    apiPromise = new ApiPromise({
      provider: new WsProvider(configs.crust.chainWsUrl, 1000),
      typesBundle: typesBundleForPolkadot,
    });
    await apiPromise.isReady;
  }
  return apiPromise;
};
