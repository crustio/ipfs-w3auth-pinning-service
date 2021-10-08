import {KeyringPair} from '@polkadot/keyring/types';
import {ApiPromise} from '@polkadot/api';
import {SubmittableExtrinsic} from '@polkadot/api/promise/types';
import {logger} from '../../logger';

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
    }).catch(e => {
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

interface BlockResult {
  block: Block;
}

interface Block {
  header: Header;
}

interface Header {
  number: number;
}

export async function getFinalizeBlockNumber(api: ApiPromise) {
  await api.isReadyOrError;
  const res = await api.rpc.chain.getFinalizedHead();
  if (res) {
    const block = await api.rpc.chain.getBlock(res);
    const data = block ? JSON.parse(JSON.stringify(block)) : null;
    if (data) {
      const blockData = data as BlockResult;
      return blockData.block.header.number;
    }
    return null;
  }
  return null;
}
