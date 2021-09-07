const _ = require('lodash');
import {sequelize} from '../db/db';

const commonDao = {
  queryForCount: queryForCount,
  queryForArray: queryForArray,
  queryForObj: queryForObj,
};

function queryForCount(sql: string, replace: any[]): Promise<number> {
  return sequelize
    .query(sql, {
      replacements: replace,
      type: sequelize.QueryTypes.SELECT,
      raw: true,
    })
    .then((r: any[]) => {
      if (!_.isEmpty(r)) {
        const res = r[0];
        return res[Object.keys(res)[0]];
      }
    });
}

function queryForArray(sql: string, replace: any[]): Promise<any[]> {
  return sequelize
    .query(sql, {
      replacements: replace,
      type: sequelize.QueryTypes.SELECT,
    })
    .then((r: any[]) => {
      if (!_.isEmpty(r)) {
        return r;
      }
      return [];
    });
}

function queryForObj(sql: string, replace: any[]): Promise<any> {
  return sequelize
    .query(sql, {
      replacements: replace,
      type: sequelize.QueryTypes.SELECT,
    })
    .then((r: any[]) => {
      if (!_.isEmpty(r)) {
        return r[0];
      }
      return {};
    });
}

module.exports = commonDao;
