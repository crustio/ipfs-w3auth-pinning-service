import {PinObjectsQuery, PinResults, PinStatus} from '../models/PinObjects';
import {PinObjectStatus} from "../common/commonUtils";
const {TextMatchingStrategy} = require('../common/commonUtils');
const _ = require('lodash');
const commonDao = require('./commonDao');
const pinObjectDao = {
  selectPinObjectCountByQuery: selectPinObjectCountByQuery,
  selectPinObjectListByQuery: selectPinObjectListByQuery,
  selectPinObjectByRequestIdAndUserId: selectPinObjectByRequestIdAndUserId,
  deletePinObjectByRequestIdAndUserId: deletePinObjectByRequestIdAndUserId,
  queryPinningObjects: queryPinningObjects,
};

async function deletePinObjectByRequestIdAndUserId(
  requestId: string,
  userId: number
) {
  return commonDao.queryForUpdate(
    'update pin_object set deleted = 1 where user_id = ? and request_id = ?',
    [userId, requestId]
  );
}

async function queryPinningObjects(limit: number = 100) {
    return commonDao.queryForArray(
        'select * from pin_object where deleted = ? and status = ? limit ?',
        [0, PinObjectStatus.pinning, limit]
    );
}

async function selectPinObjectByRequestIdAndUserId(
  requestId: string,
  userId: number
): Promise<PinStatus> {
  const result = await commonDao.queryForObj(
    'select * from pin_object where deleted = 0 and user_id = ? and request_id = ?',
    [userId, requestId]
  );
  if (!_.isEmpty(result)) {
    return PinStatus.parseBaseData(result);
  } else {
    return null;
  }
}

async function selectPinObjectListByQuery(
  query: PinObjectsQuery
): Promise<PinResults> {
  const count = await selectPinObjectCountByQuery(query);
  const pinResult = new PinResults();
  pinResult.count = count;
  if (count > 0) {
    const [sql, args] = await parsePinObjectQuery(
      query,
      'select * from pin_object where deleted = 0 and user_id = ?',
      [query.userId]
    );
    const result = await commonDao.queryForArray(sql, args);
    pinResult.results = _.map(result, (i: any) => PinStatus.parseBaseData(i));
  } else {
    pinResult.results = [];
  }
  return pinResult;
}

function selectPinObjectCountByQuery(query: PinObjectsQuery): Promise<number> {
  const [sql, args] = parsePinObjectQuery(
    query,
    'select count(*) from pin_object where deleted = 0 and user_id = ?',
    [query.userId]
  );
  return commonDao.queryForCount(sql, args);
}

function parsePinObjectQuery(
  query: PinObjectsQuery,
  baseSql: string,
  baseArgs: any[]
): [string, any[]] {
  let sql = baseSql;
  let args = baseArgs;
  if (query.cid) {
    if (_.isArray(query.cid)) {
      sql = `${sql} and cid in (${_.map(query.cid, () => '?').join(',')})`;
    } else {
      sql = `${sql} and cid = ?`;
    }
    args = _.concat(args, query.cid);
  }
  if (query.after) {
    sql = `${sql} and create_time > ?`;
    args.push(query.after);
  }
  if (query.before) {
    sql = `${sql} and create_time < ?`;
    args.push(query.before);
  }
  if (query.status) {
    if (_.isArray(query.status)) {
      sql = `${sql} and status in (${_.map(query.status, () => '?').join(
        ','
      )})`;
    } else {
      sql = `${sql} and status = ?`;
    }
    args = _.concat(args, query.status);
  }
  if (query.name) {
    if (query.match === TextMatchingStrategy.exact) {
      sql = `${sql} and name = ?`;
      args.push(query.name);
    } else if (query.match === TextMatchingStrategy.iexact) {
      sql = `${sql} and UPPER(name) = ?`;
      args.push(query.name.toUpperCase());
    } else if (query.match === TextMatchingStrategy.partial) {
      sql = `${sql} and name like ?`;
      args.push(`%${query.name}%`);
    } else {
      sql = `${sql} and UPPER(name) like ?`;
      args.push(`%${query.name}%`);
    }
  }
  if (query.meta && query.meta.size > 0) {
    const metaSql: string[] = [];
    query.meta.forEach((value: string, key: string) => {
      let queryValue = value;
      if (query.match === TextMatchingStrategy.iexact) {
        queryValue = `"${value}"`;
        metaSql.push('UPPER(meta->?)=UPPER(?)');
      } else if (query.match === TextMatchingStrategy.partial) {
        queryValue = `%${value}%`;
        metaSql.push('meta->? like ?');
      } else if (query.match === TextMatchingStrategy.ipartial) {
        queryValue = `%${value}%`;
        metaSql.push('UPPER(meta->?) like UPPER(?)');
      } else {
        metaSql.push('meta->?=?');
      }
      args.push(`$.${key}`, queryValue);
    });
    sql = `${sql} and (${metaSql.join(' and ')})`;
  }
  sql = `${sql} order by create_time desc`;
  if (query.limit) {
    sql = `${sql} limit ?`;
    args.push(query.limit);
  }
  return [sql, args];
}

module.exports = pinObjectDao;
