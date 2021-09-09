require('mysql2');
const Sequelize = require('sequelize');
import {configs} from '../config/config';
const {getEnv} = require('../common/commonUtils');

export const sequelize = new Sequelize(
  configs.db.db,
  configs.db.user,
  configs.db.password,
  {
    host: configs.db.host,
    port: configs.db.port,
    logging: !(getEnv('NODE_ENV', 'test') === 'production'),
    dialect: 'mysql',
    pool: {
      max: configs.db.db_pool_max,
      min: configs.db.db_pool_min,
      idle: configs.db.db_pool_idle,
      acquire: configs.db.db_pool_acquire,
    },
    operatorsAliases: false,
    timezone: '+08:00',
  }
);
