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
    userId: number,
) {
  return commonDao.queryForUpdate(
    `update pin_object set deleted = 1 where user_id = ? and request_id = ?`,
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
    console.log(result);
    pinResult.results = _.map(result, (i: any) => PinStatus.parseBaseData(i));
    console.log(pinResult.results);
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
  if (query.cid && query.cid.length > 0) {
    sql = `${sql} and cid in (${_.map(query.cid, () => '?').join(',')})`;
    args = _.concat(args, query.cid);
  }
  if (query.after) {
    sql = `${sql} and created >= ?`;
    args.push(query.after);
  }
  if (query.before) {
    sql = `${sql} and created <= ?`;
    args.push(query.before);
  }
  if (query.status && query.status.length > 0) {
    sql = `${sql} and status in (${_.map(query.status, () => '?').join(',')})`;
    args = _.concat(args, query.status);
  }
  if (query.name) {
    sql = `${sql} and name = ?`;
    args.push(query.name);
  }
  if (query.meta && query.meta.size > 0) {
    const metaSql: string[] = [];
    query.meta.forEach((value: string, key: string) => {
      args.push(key, value);
      if (query.match === TextMatchingStrategy.iexact) {
        metaSql.push("UPPER(meta->?)=UPPER('?')");
      } else if (query.match === TextMatchingStrategy.partial) {
        metaSql.push("meta->? like '%?%'");
      } else if (query.match === TextMatchingStrategy.ipartial) {
        metaSql.push("UPPER(meta->?) like UPPER('%?%')");
      } else {
        metaSql.push('meta->?=?');
      }
    });
    sql = `${sql} and (${metaSql.join(' and ')})`;
  }
  return [sql, args];
}

module.exports = pinObjectDao;
