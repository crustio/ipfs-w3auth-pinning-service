import {ApiPromise} from '@polkadot/api';
import BigNumber from 'bignumber.js';

export function formatBalance(balance: string) {
  const balanceBN = new BigNumber(balance);
  return balanceBN.dividedBy(1_000_000_000_000).toString();
}
export async function getAccountBalance(api: ApiPromise, account: string) {
  await api.isReadyOrError;
  const infoStr = await api.query.system.account(account);
  const info = JSON.parse(JSON.stringify(infoStr));
  return formatBalance(info.data.free);
}
export async function blockInfo(
  api: ApiPromise,
  blockHash: string,
  extrinsicHash: string
) {
  await api.isReadyOrError;
  const signedBlock = await api.rpc.chain.getBlock(blockHash);
  return signedBlock.block;
}
