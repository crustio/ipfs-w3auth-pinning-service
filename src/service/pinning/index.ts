import {Pin, PinStatus, PinObjects} from '../../models/PinObjects';
import {uuid, PinObjectStatus, fromDecimal} from '../../common/commonUtils';
import {configs} from '../../config/config';
import {
  placeOrder,
  getOrderState,
  checkAccountBalanceAndWarning,
  sendCrustOrderWarningMsg,
  sendTx,
} from '../crust/order';
import {apiConnect, disconnectApi} from '../crust/api';
import createKeyring from '../crust/krp';
const commonDao = require('../../dao/commonDao');
const moment = require('moment');
const _ = require('lodash');
import {logger} from '../../logger';
import {timeoutOrError} from '../../common/promise-utils';
import {ApiPromise} from "@polkadot/api";
import {disconnect} from "node:cluster";
const Sequelize = require('sequelize');
const {sleep} = require('../../common/commonUtils');
const pinObjectDao = require('../../dao/pinObjectDao');
const Op = Sequelize.Op;

export async function replacePin(
  userId: number,
  requestId: string,
  pin: Pin
): Promise<PinStatus> {
  await pinObjectDao.deletePinObjectByRequestIdAndUserId(requestId, userId);
  return pinByCid(userId, pin);
}

export async function pinByCid(userId: number, pin: Pin): Promise<PinStatus> {
  let pinObjects = await PinObjects.findOne({
    where: {user_id: userId, cid: pin.cid},
  });
  if (_.isEmpty(pinObjects)) {
    const obj = {
      name: pin.name ? pin.name : pin.cid,
      request_id: uuid(),
      user_id: userId,
      cid: pin.cid,
      status: PinObjectStatus.queued,
      meta: pin.meta,
      origins: [...pin.origins].join(','),
      delegates: configs.ipfs.delegates.join(','),
    };
    logger.info(`obj: ${JSON.stringify(obj)}`);
    pinObjects = await PinObjects.create(obj);
  } else {
    pinObjects.request_id = uuid();
    pinObjects.update_time = moment().format('YYYY-MM-DD HH:mm:ss');
    pinObjects.status = PinObjectStatus.queued;
    pinObjects.meta = pin.meta;
    pinObjects.origins = [...pin.origins].join(',');
    pinObjects.delegates = configs.ipfs.delegates.join(',');
    pinObjects.retry_times = 0;
    pinObjects.deleted = 0;
    await pinObjects.save();
  }
  return PinStatus.parseBaseData(pinObjects);
}

export async function orderStart() {
  while (true) {
    let apiPromise;
    try {
      apiPromise = apiConnect();
      const checkAccount = await checkAccountBalanceAndWarning(apiPromise);
      if (!checkAccount) {
        await sleep(configs.crust.loopTimeAwait);
        continue;
      }
      await placeOrderQueuedFiles(apiPromise);
      await sleep(configs.crust.loopTimeAwait);
    } catch (e) {
      logger.error(`place order loop error: ${e.message}`);
      sendCrustOrderWarningMsg(
        `crust-pinner(${configs.server.name}) error`,
        `### crust-pinner(${configs.server.name}) error \n err msg: ${e.message}`
      );
      await sleep(configs.crust.loopTimeAwait);
    } finally {
      await disconnectApi(apiPromise)
    }
  }
}

async function placeOrderQueuedFiles(apiPromise: ApiPromise) {
  logger.info('start placeOrderQueuedFiles');
  const pinObjects = await PinObjects.findAll({
    where: {
      deleted: 0,
      [Op.or]: [
        {status: PinObjectStatus.failed},
        {status: PinObjectStatus.queued},
      ],
      retry_times: {
        [Op.lt]: configs.crust.orderRetryTimes,
      },
    },
    order: [['update_time', 'asc']],
  });
  if (_.isEmpty(pinObjects)) {
    logger.info('not pin objects to order');
    return;
  }
  const cidRetryGroup = _(pinObjects)
    .groupBy((i: any) => i.cid)
    .toPairs()
    .map((i: any) => _.maxBy(i[1], 'retry_times'))
    .groupBy((i: any) => i.cid)
    .value();
  for (const cid of _.map(cidRetryGroup, (i: any, j: any) => j)) {
    const needToOrder = await needOrder(cid, cidRetryGroup[cid][0].retry_times);
    if (needToOrder.needOrder) {
      await placeOrderInCrust(apiPromise, cid, needToOrder.retryTimes).catch(e => {
        logger.error(`order error catch: ${JSON.stringify(e)} cid: ${cid}`);
      });
      await sleep(configs.crust.orderTimeAwait);
    } else {
      await PinObjects.update(
        {
          status: needToOrder.status,
          retry_times: needToOrder.retryTimes,
        },
        {
          where: {
            deleted: 0,
            cid: cid,
            [Op.or]: [
              {status: PinObjectStatus.failed},
              {status: PinObjectStatus.queued},
            ],
          },
        }
      );
    }
  }
}

async function needOrder(
  cid: string,
  retryTimes: number
): Promise<PinObjectState> {
  const result = new PinObjectState();
  result.needOrder = retryTimes <= configs.crust.orderRetryTimes;
  result.retryTimes = retryTimes;
  result.status = !result.needOrder
    ? PinObjectStatus.failed.toString()
    : PinObjectStatus.pinning.toString();
  return result;
}

class PinObjectState {
  needOrder = false;
  retryTimes = 0;
  status: string;
}

async function placeOrderInCrust(apiPromise: ApiPromise, cid: string, retryTimes = 0) {
  let pinStatus = PinObjectStatus.pinning;
  let retryTimeAdd = false;
  try {
    const fileCid = cid;
    const fileSize = configs.crust.defaultFileSize;
    const seeds = configs.crust.seed;
    const tips = configs.crust.tips;
    const krp = createKeyring(seeds);
    logger.info(`order cid: ${cid} in crust`);
    pinStatus = PinObjectStatus.pinning;
    const res = await timeoutOrError(
      'Crust place order',
      placeOrder(
        apiPromise,
        krp,
        fileCid,
        fileSize,
        fromDecimal(tips).toFixed(0),
        undefined
      ),
      configs.crust.transactionTimeout
    );
    if (!res) {
      retryTimeAdd = true;
      pinStatus = PinObjectStatus.failed;
      logger.error(`order cid: ${cid} failed result is empty`);
    }
  } catch (e) {
    pinStatus = PinObjectStatus.failed;
    retryTimeAdd = true;
    logger.error(`order cid: ${cid} failed error: ${e.toString()}`);
  } finally {
    const times =
      retryTimeAdd && retryTimes <= configs.crust.orderRetryTimes
        ? retryTimes + 1
        : retryTimes;
    await PinObjects.update(
      {
        status: pinStatus,
        retry_times: times,
      },
      {
        where: {
          deleted: 0,
          cid: cid,
          [Op.or]: [
            {status: PinObjectStatus.failed},
            {status: PinObjectStatus.queued},
          ],
        },
      }
    );
  }
}

export async function updatePinObjectStatus() {
  let apiPromise;
  while (true) {
      try {
        const pinningObjects = await pinObjectDao.queryPinningObjects();
        if (_.isEmpty(pinningObjects)) {
          await sleep(configs.crust.loopTimeAwait);
          continue;
        }
        apiPromise = apiConnect();
        for (const obj of pinningObjects) {
            const res = await getOrderState(apiPromise, obj.cid);
            if (res) {
              if (
                  res.meaningfulData.reported_replica_count >=
                  configs.crust.validFileSize
              ) {
                obj.status = PinObjectStatus.pinned;
              } else {
                obj.status = PinObjectStatus.pinning;
              }
            } else {
              // invalid file size
              obj.deleted = 1;
              obj.status = PinObjectStatus.failed;
            }
            await PinObjects.update({
                status: obj.status,
                deleted: obj.deleted,
            }, {
                where: { id: obj.id }
            });
        }
      } catch (e) {
        logger.error(`get order state err: ${e}`);
      } finally {
        await disconnectApi(apiPromise);
      }
  }
}

export async function pinExpireFiles() {
  let apiPromise;
  while(true) {
    try {
      apiPromise = apiConnect();
      const pinningObjects = await PinObjects.findAll({
        where: { status: PinObjectStatus.pinned, deleted: 0 },
        order: [['id', 'asc']],
        limit: 1000
      });
      if (_.isEmpty(pinningObjects)) {
        await sleep(1000 * 6);
        continue;
      }
      const hash = await apiPromise.rpc.chain.getFinalizedHead();
      const block = await apiPromise.rpc.chain.getBlock(hash);
      const finalizeNumber = block.block.header.number.toNumber();
      for (const p of pinningObjects) {
        const existFileNotPinned = await PinObjects.findOne({
          attributes: ['id'],
          where: { status: PinObjectStatus.queued, deleted: 0 },
          order: [['id', 'asc']],
          limit: 1
        });
        if (_.isEmpty(existFileNotPinned)) {
          const res = await getOrderState(apiPromise, p.cid);
          if (_.isEmpty(res) || (res.meaningfulData.expired_at <= (finalizeNumber + configs.crust.expireBlockNumber))) {
            await PinObjects.update({status: PinObjectStatus.queued, retry_times: 0}, { where: { id: p.id } })
          }
        }
        await sleep(100);
      }
    } catch (e) {
      await sleep(1000 * 60);
    } finally {
      await disconnectApi(apiPromise);
    }
  }
}
