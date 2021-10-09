import {Pin, PinStatus, PinObjects} from '../../models/PinObjects';
import {uuid, PinObjectStatus, fromDecimal} from '../../common/commonUtils';
import {configs} from '../../config/config';
import {
  placeOrder,
  getOrderState,
  getFinalizeBlockNumber,
} from '../crust/order';
import {api} from '../crust/api';
import createKeyring from '../crust/krp';
const commonDao = require('../../dao/commonDao');
const moment = require('moment');
const _ = require('lodash');
import {logger} from '../../logger';
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
    await pinObjects.save();
  }
  return PinStatus.parseBaseData(pinObjects);
}

export async function orderStart() {
  for (;;) {
    await placeOrderQueuedFiles().catch(e => {
      logger.error(`place order queued files failed: ${JSON.stringify(e)}`);
    });
    await sleep(60000);
  }
}

async function placeOrderQueuedFiles() {
  logger.info('start placeOrderQueuedFiles');
  const pinObjects = await PinObjects.findAll({
    where: {
      deleted: 0,
      [Op.or]: [
        {status: PinObjectStatus.failed},
        {status: PinObjectStatus.queued},
      ],
    },
  });
  // distinct by cid
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
      await placeOrderInCrust(cid, needToOrder.retryTimes).catch(e => {
        logger.error(`order in crust failed: ${JSON.stringify(e)}`);
      });
      await sleep(configs.crust.orderTimeGap);
    } else {
      await PinObjects.update(
        {
          status: needToOrder.status,
          retry_times: needToOrder.retryTimes,
          deleted:
            needToOrder.retryTimes > configs.crust.orderRetryTimes ? 1 : 0,
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
  const orderState = await getOrderState(api, cid);
  const result = new PinObjectState();
  if (orderState) {
    const expiredAt = orderState.meaningfulData.expired_at;
    const currentBlockNumber = await getFinalizeBlockNumber(api);
    result.needOrder = expiredAt < currentBlockNumber;
    result.status = !result.needOrder
      ? PinObjectStatus.pinned.toString()
      : PinObjectStatus.pinning.toString();
    return result;
  } else {
    result.needOrder = retryTimes <= configs.crust.orderRetryTimes;
    result.retryTimes = retryTimes;
    result.status = !result.needOrder
      ? PinObjectStatus.failed.toString()
      : PinObjectStatus.pinning.toString();
    return result;
  }
}

class PinObjectState {
  needOrder = false;
  retryTimes = 0;
  status: string;
}

async function placeOrderInCrust(cid: string, retryTimes = 0) {
  let pinStatus = PinObjectStatus.pinning;
  let retryTimeAdd = false;
  try {
    const fileCid = cid;
    const fileSize = configs.crust.defaultFileSize;
    const seeds = configs.crust.seed;
    const tips = configs.crust.tips;
    const krp = createKeyring(seeds);
    const res = await placeOrder(
      api,
      krp,
      fileCid,
      fileSize,
      fromDecimal(tips).toFixed(0),
      undefined
    );
    if (!res) {
      throw new Error('Order Failed');
    }
    pinStatus = PinObjectStatus.pinning;
  } catch (e) {
    pinStatus = PinObjectStatus.failed;
    retryTimeAdd = true;
    throw new Error(e);
  } finally {
    const times =
      retryTimeAdd && retryTimes <= configs.crust.orderRetryTimes
        ? retryTimes + 1
        : retryTimes;
    await PinObjects.update(
      {
        status: pinStatus,
        retry_times: times,
        deleted: times > configs.crust.orderRetryTimes ? 1 : 0,
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
  const pinningObjects = await PinObjects.findAll({
    where: {status: PinObjectStatus.pinning, deleted: 0},
  });
  if (!_.isEmpty(pinningObjects)) {
    for (const obj of pinningObjects) {
      try {
        const res = await getOrderState(api, obj.cid);
        if (res) {
          logger.info(
            `res.meaningfulData.reported_replica_count: ${res.meaningfulData.reported_replica_count}`
          );
          logger.info(
            `configs.crust.validFileSize: ${configs.crust.validFileSize}`
          );
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
        await obj.save();
      } catch (e) {
        logger.error(`get order state err: ${e}`);
      }
    }
  }
}
