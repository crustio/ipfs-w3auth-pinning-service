require('mysql2');
const Sequelize = require('sequelize');
const config = require('../config/config');
const { getEnv } = require('../common/commonUtils');
const host = getEnv('MYSQL_HOST', config.db.host);
const port = getEnv('MYSQL_PORT', config.db.port);
const db = getEnv('MYSQL_DB', config.db.db);
const user = getEnv('MYSQL_USER', config.db.user);
const password = getEnv('MYSQL_PASSWORD', config.db.password);
const dbPoolIdle = getEnv('MYSQL_DB_POOL_IDLE', config.db.db_pool_idle);
const dbPoolAcquire = getEnv('MYSQL_PASSWORD', config.db.db_pool_acquire);
const dbPoolMax = getEnv('MYSQL_PASSWORD', config.db.db_pool_max);
const dbPoolMin = getEnv('MYSQL_PASSWORD', config.db.db_pool_min);

module.exports = new Sequelize(db, user, password, {
    host: host,
    port: port,
    logging: false,
    dialect: 'mysql',
    pool: {
        max: dbPoolMax,
        min: dbPoolMin,
        idle: dbPoolIdle,
        acquire: dbPoolAcquire
    },
    operatorsAliases: false,
    timezone: '+08:00'
});
