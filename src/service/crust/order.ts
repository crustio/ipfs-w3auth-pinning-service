import {KeyringPair} from '@polkadot/keyring/types';
import {ApiPromise} from '@polkadot/api';
import {SubmittableExtrinsic} from '@polkadot/api/promise/types';
import {configs} from '../../config/config';
import {logger} from '../../logger';
import BigNumber from 'bignumber.js';
import {sleep} from '../../common/commonUtils';
import createKeyring from './krp';
const ChatBot = require('dingtalk-robot-sender');
const robot = new ChatBot({
  webhook: `https://oapi.dingtalk.com/robot/send?access_token=${configs.crust.warningAccessToken}`,
});

async function checkingAccountBalance(api: ApiPromise): Promise<boolean> {
  try {
    await api.isReady;
    const seeds = configs.crust.seed;
    const krp = createKeyring(seeds);
    let orderBalance = await getAccountBalance(api, krp.address);
    orderBalance = orderBalance.dividedBy(1_000_000_000_000);
    const minimumAmount = configs.crust.minimumAmount;
    if (orderBalance.comparedTo(minimumAmount) >= 0) {
      return true;
    }
    logger.error(
      `orderBalance: ${orderBalance.toFixed(5)} min: ${minimumAmount}`
    );
    sendCrustOrderWarningMsg(
      'crust-pinner balance warning',
      `### crust-pinner(${configs.server.name}) \n address: ${
        krp.address
      } \n current balance: ${orderBalance
        .dividedBy(1_000_000_000_000)
        .toString()}cru, min balance: ${minimumAmount}cru`
    );
  } catch (e) {
    logger.warn(`check account balance failed: ${e.message}`);
  }
  return false;
}

export async function checkAccountBalanceAndWarning(
  api: ApiPromise
): Promise<boolean> {
  let retryTimes = 0;
  while (retryTimes <= configs.crust.checkAmountRetryTimes) {
    if (await checkingAccountBalance(api)) {
      return true;
    }
    await sleep(configs.crust.checkAmountTimeAwait);
    retryTimes++;
  }
  return false;
}

export function sendCrustOrderWarningMsg(title: string, text: string) {
  const textContent = {
    actionCard: {
      title: title,
      text: text,
    },
    msgtype: 'actionCard',
  };
  robot.send(textContent);
}

export async function getAccountBalance(
  api: ApiPromise,
  account: string
): Promise<BigNumber> {
  await api.isReadyOrError;
  const infoStr = await api.query.system.account(account);
  const info = JSON.parse(JSON.stringify(infoStr));
  return new BigNumber(info.data.free);
}

export async function placeOrder(
  api: ApiPromise,
  krp: KeyringPair,
  fileCID: string,
  fileSize: number,
  tip: string,
  memo: string
) {
  // Determine whether to connect to the chain
  await api.isReadyOrError;
  // Generate transaction
  // fileCid, fileSize, tip, 0
  const pso = api.tx.market.placeStorageOrder(fileCID, fileSize, tip, memo);
  const txRes = JSON.parse(JSON.stringify(await sendTx(krp, pso)));
  return JSON.parse(JSON.stringify(txRes));
}

export async function sendTx(krp: KeyringPair, tx: SubmittableExtrinsic) {
  return new Promise((resolve, reject) => {
    tx.signAndSend(krp, ({events = [], status}) => {
      logger.info(
        `  ↪ 💸 [tx]: Transaction status: ${status.type}, nonce: ${tx.nonce}`
      );

      if (
        status.isInvalid ||
        status.isDropped ||
        status.isUsurped ||
        status.isRetracted
      ) {
        reject(new Error('order invalid'));
      }

      if (status.isInBlock) {
        events.forEach(({event: {method, section}}) => {
          if (section === 'system' && method === 'ExtrinsicFailed') {
            // Error with no detail, just return error
            logger.info(`  ↪ 💸 ❌ [tx]: Send transaction(${tx.type}) failed.`);

            resolve(false);
          } else if (method === 'ExtrinsicSuccess') {
            logger.info(
              `  ↪ 💸 ✅ [tx]: Send transaction(${tx.type}) success.`
            );
          }
        });
        logger.info('Included at block hash', status.asInBlock.toHex());
        resolve(status.asInBlock.toHex());
      } else if (status.isFinalized) {
        logger.info('Finalized block hash', status.asFinalized.toHex());
      }
    }).catch((e: any) => {
      reject(e);
    });
  });
}

interface IFileInfo {
  file_size: number;
  expired_at: number;
  calculated_at: number;
  amount: number;
  prepaid: number;
  reported_replica_count: number;
  replicas: [any];
}

export async function getOrderState(api: ApiPromise, cid: string) {
  await api.isReadyOrError;
  const res = await api.query.market.files(cid);
  const data = res ? JSON.parse(JSON.stringify(res)) : null;
  if (data) {
    try {
      const {replicas, ...meaningfulData} = data as IFileInfo;
      return {
        meaningfulData,
        replicas,
      };
    } catch (e) {
      return null;
    }
  }
  return null;
}

export async function getFinalizeBlockNumber(api: ApiPromise) {
  await api.isReadyOrError;
  const res = await api.rpc.chain.getHeader();
  if (res) {
    return res.number.toNumber();
  }
  return null;
}
