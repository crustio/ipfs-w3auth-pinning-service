import {KeyringPair} from '@polkadot/keyring/types';
import {ApiPromise} from '@polkadot/api';
import {SubmittableExtrinsic} from '@polkadot/api/promise/types';
import {logger} from '../../logger';
import {fromDecimal, parserStrToObj} from '../../common/commonUtils';
import BigNumber from 'bignumber.js';

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
export async function orderPrice(
  api: ApiPromise,
  account: string,
  fileSize: string
) {
  // Determine whether to connect to the chain
  await api.isReadyOrError;
  // basePrice = (basePrice + byteFee * size + key_count_fee) * benefit
  // benefits = 1 - min(active_funds / total_market_active_funds, 0.1)
  const basePrice = await api.query.market.fileBaseFee();
  const fileByteFee = await api.query.market.fileByteFee();
  const fileKeysCountFee = (await api.query.market.fileKeysCountFee()) as any;
  const currentBenefits = await api.query.benefits.currentBenefits();
  const marketBenefits = await api.query.benefits.marketBenefits(account);
  const filePrice =
    new BigNumber(fileByteFee.toString()).multipliedBy(
      new BigNumber(fileSize)
    ) || new BigNumber(0);
  const total_market_active_funds = currentBenefits
    ? parserStrToObj(currentBenefits).total_market_active_funds
    : 0;
  const active_funds = marketBenefits
    ? parserStrToObj(marketBenefits).active_funds
    : 0;
  const benefits =
    1 - Math.min(active_funds / (total_market_active_funds || 1), 0.1);
  const _filePrice = filePrice
    ?.multipliedBy(new BigNumber(fileSize))
    .dividedBy(1024 * 1024)
    .plus(new BigNumber(fileKeysCountFee))
    .plus(new BigNumber(basePrice.toString()))
    .multipliedBy(new BigNumber(benefits));
  return {
    basePrice: basePrice.toString(),
    totalPrice: _filePrice.toFixed(0),
  };
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
        reject(false);
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
    }).catch(e => {
      reject(e);
    });
  });
}

const batchSendTxs = (api: ApiPromise, krp: KeyringPair, txs: any) => {
  return new Promise((resolve, reject) => {
    api.tx.utility.batchAll(txs).signAndSend(krp, ({events = [], status}) => {
      logger.info(`  ↪ 💸 [tx]: Transaction status: ${status.type}`);

      if (
        status.isInvalid ||
        status.isDropped ||
        status.isUsurped ||
        status.isRetracted
      ) {
        reject(new Error('Invalid transaction.'));
      }

      if (status.isInBlock) {
        events.forEach(({event: {method, section}}) => {
          if (section === 'system' && method === 'ExtrinsicFailed') {
            // Error with no detail, just return error
            logger.info('  ↪ 💸 ❌ [tx]: Send transaction failed.');
            reject(new Error('Send transaction failed.'));
          } else if (method === 'ExtrinsicSuccess') {
            logger.info(
              `  ↪ 💸 ✅ [tx]: Send transaction(${api.tx.type}) success.`
            );
          }
        });
        logger.info('Included at block hash', status.asInBlock.toHex());

        resolve(status.asInBlock.toHex());
      } else if (status.isFinalized) {
        logger.info('Finalized block hash', status.asFinalized.toHex());
      }
    });
  });
};

interface IFileInfo {
  file_size: number;
  expired_on: number;
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

export async function transfer(
  api: ApiPromise,
  krp: KeyringPair,
  amount: string,
  account: string
) {
  await api.isReadyOrError;
  // Generate transaction
  const amountBN = fromDecimal(amount);
  const txPre = api.tx.balances.transfer(account, amountBN.toFixed(0));

  const paymentStr = await txPre.paymentInfo(account);
  const feeExpected = paymentStr.toJSON().partialFee as string;
  const tx = api.tx.balances.transfer(
    account,
    amountBN.minus(new BigNumber(feeExpected)).toFixed(0)
  );
  const blockHash = await sendTx(krp, tx);
  return {blockHash, extrinsicHash: tx.hash.toHex()};
}
interface IRecord {
  address: string;
  amount: string;
}
export async function transferBatch(
  api: ApiPromise,
  krp: KeyringPair,
  records: IRecord[]
) {
  const txs = records.map(r =>
    api.tx.balances.transfer(r.address, fromDecimal(r.amount).toFixed(0))
  );
  return batchSendTxs(api, krp, txs);
}
