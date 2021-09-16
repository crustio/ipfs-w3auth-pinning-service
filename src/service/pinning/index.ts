import {Pin, PinStatus, PinObjects} from '../../models/PinObjects';
import {uuid, PinObjectStatus, fromDecimal} from '../../common/commonUtils';
import {configs} from '../../config/config';
import {placeOrder, getOrderState} from '../crust/order';
import {api} from '../crust/api';
import createKeyring from '../crust/krp';
const moment = require('moment');
const _ = require('lodash');
import {logger} from '../../logger';
const Sequelize = require('sequelize');
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
  // order in crust
  try {
    const fileCid = pin.cid;
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
  } catch (e) {
    throw new Error(e);
  }
  if (_.isEmpty(pinObjects)) {
    const obj = {
      name: pin.name ? pin.name : pin.cid,
      request_id: uuid(),
      user_id: userId,
      cid: pin.cid,
      status: PinObjectStatus.pinning,
      meta: pin.meta,
      origins: [...pin.origins].join(','),
      delegates: configs.ipfs.delegates.join(','),
    };
    logger.info(`obj: ${JSON.stringify(obj)}`);
    pinObjects = await PinObjects.create(obj);
  } else {
    pinObjects.request_id = uuid();
    pinObjects.update_time = moment().format('YYYY-MM-DD HH:mm:ss');
    pinObjects.status = PinObjectStatus.pinned;
    pinObjects.meta = pin.meta;
    pinObjects.origins = [...pin.origins].join(',');
    pinObjects.deleted = 0;
    pinObjects.delegates = configs.ipfs.delegates.join(',');
    await pinObjects.save();
  }
  return PinStatus.parseBaseData(pinObjects);
}

export async function updatePinObjectStatus() {
  const pinningObjects = await PinObjects.findAll({
    where: {
      [Op.or]: [
        {status: PinObjectStatus.pinning},
        {status: PinObjectStatus.queued},
      ],
    },
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
          obj.status = PinObjectStatus.failed;
        }
        await obj.save();
      } catch (e) {
        logger.error(`get order state err: ${e}`);
      }
    }
  }
}
