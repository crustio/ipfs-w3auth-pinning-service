import * as Sequelize from 'sequelize';
import {sequelize} from '../db/db';
import {Request} from 'express';
const _ = require('lodash');
const moment = require('moment');

const DEFAULT_DELEGATES = ['/ip4/183.131.193.198/tcp/14001/p2p/12D3KooWMcAHcs97R49PLZjGUKDbP1fr9iijeepod8fkktHTLCgN'];

export const PinObjects = sequelize.define(
  'pin_object',
  {
    id: {
      type: Sequelize.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    request_id: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    user_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
    },
    cid: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    status: {
      type: Sequelize.STRING(16),
      allowNull: false,
    },
    info: Sequelize.JSON,
    meta: Sequelize.JSON,
    delegates: Sequelize.TEXT,
    origins: Sequelize.TEXT,
    create_time: Sequelize.DATE,
    update_time: Sequelize.DATE,
    deleted: Sequelize.INTEGER,
    retry_times: Sequelize.INTEGER,
  },
  {
    timestamps: false,
    tableName: 'pin_object',
  }
);

export class PinObjectsQuery {
  userId: number;
  cid: string[];
  name: string;
  match: string;
  status: string[];
  before: string;
  after: string;
  limit: number;
  meta: Map<string, string>;

  static parseQuery(req: Request): PinObjectsQuery {
    const query = new PinObjectsQuery();
    query.userId = _.parseInt(req.query.userId as string);
    query.cid = req.query.cid ? (req.query.cid as string).split(',') : null;
    query.name = req.query.name as string;
    query.match = req.query.match as string;
    query.status = req.query.status
      ? (req.query.status as string).split(',')
      : null;
    query.before = req.query.before
      ? moment(req.query.before).format('YYYY-MM-DD HH:mm:ss')
      : null;
    query.after = req.query.after
      ? moment(req.query.after).format('YYYY-MM-DD HH:mm:ss')
      : null;
    query.limit = _.parseInt(req.query.limit as string);
    const meta = new Map<string, string>();
    req.query = _.omit(req.query, baseQuery);
    _.forEach(req.query, (v: string, k: string) => {
      meta.set(k, v);
    });
    query.meta = meta;
    return query;
  }
}

export class PinResults {
  count: number;
  results: PinStatus[];
}

export class PinStatus {
  requestid: string;
  status: string;
  created: string;
  pin: Pin;
  delegates: string[];
  info: Map<string, string>;

  static parseBaseData(baseData: any): PinStatus {
    const result = new PinStatus();
    result.requestid = baseData.request_id;
    result.status = baseData.status;
    result.created = dateFormat(baseData.create_time);
    result.pin = Pin.parseBaseData(baseData);
    result.delegates = baseData.delegates ? baseData.delegates.split(',') : DEFAULT_DELEGATES;
    result.info = baseData.info ? baseData.info : {};
    return result;
  }
}

export class Pin {
  cid: string;
  name: string;
  origins: Set<string>;
  meta: Map<string, string>;

  static parseBaseData(baseData: any): Pin {
    const pin = new Pin();
    pin.cid = baseData.cid;
    pin.name = baseData.name;
    pin.meta = baseData.meta;
    pin.origins =
      baseData.origins && baseData.origins.length > 0
        ? baseData.origins.split(',')
        : [];
    return pin;
  }

  static parsePinFromRequest(req: any): Pin {
    const pin = new Pin();
    pin.cid = req.body.cid;
    pin.name = req.body.name ? req.body.name : req.body.cid;
    pin.origins = _.isEmpty(req.body.origins) ? [] : req.body.origins;
    pin.meta = req.body.meta;
    return pin;
  }
}

function dateFormat(time: any): string {
  return moment(time).format('yyyy-MM-DDTHH:mm:ssZ');
}

const baseQuery = [
  'userId',
  'cid',
  'name',
  'match',
  'status',
  'before',
  'after',
  'limit',
];
