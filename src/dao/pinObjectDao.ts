import {PinObjectsQuery, PinResults, PinStatus} from '../models/PinObjects';
const {TextMatchingStrategy} = require('../common/commonUtils');
const _ = require('lodash');
const commonDao = require('./commonDao');
const pinObjectDao = {
  selectPinObjectCountByQuery: selectPinObjectCountByQuery,
  selectPinObjectListByQuery: selectPinObjectListByQuery,
  selectPinObjectByRequestIdAndUserId: selectPinObjectByRequestIdAndUserId,
  deletePinObjectByRequestIdAndUserId: deletePinObjectByRequestIdAndUserId,
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
    sql = `${sql} and create_time >= ?`;
    args.push(query.after);
  }
  if (query.before) {
    sql = `${sql} and create_time <= ?`;
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
    sql = `${sql} and name = ?`;
    args.push(query.name);
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
  if (query.limit) {
    sql = `${sql} limit ?`;
    args.push(query.limit);
  }
  return [sql, args];
}

module.exports = pinObjectDao;
