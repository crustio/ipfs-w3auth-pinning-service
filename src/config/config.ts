const {getEnv} = require('../common/commonUtils');
const _ = require('lodash');

export const configs = {
  db: {
    host: getEnv('MYSQL_HOST', 'localhost'),
    port: _.parseInt(getEnv('MYSQL_PORT', 3306)),
    db: getEnv('MYSQL_DB', 'pinning_service'),
    user: getEnv('MYSQL_USER', 'root'),
    password: getEnv('MYSQL_PASSWORD', 'root'),
    db_pool_max: _.parseInt(getEnv('MYSQL_POOL_MAX', 10)),
    db_pool_min: _.parseInt(getEnv('MYSQL_POOL_MIN', 0)),
    db_pool_idle: _.parseInt(getEnv('MYSQL_POOL_IDLE', 30000)),
    db_pool_acquire: _.parseInt(getEnv('MYSQL_POOL_ACQUIRE', 30000)),
  },
  ipfs: {
    delegates: [] as string[],
  },
  evolution: {
    schema_table: 'data_migrations',
    location: '/migrations',
  },
  crust: {
    seed: getEnv('CRUST_SEED', ''),
    chainWsUrl:
      getEnv('NODE_ENV', 'test') === 'production'
        ? process.env.WS_ENDPOINT
        : 'wss://rpc-crust-mainnet.decoo.io',
    defaultFileSize: _.parseInt(getEnv('DEFAULT_FILE_SIZE', 2147483648)),
    tips: getEnv('CRUST_TIPS', 0.00005),
    validFileSize: _.parseInt(getEnv('VALID_FILE_REPLICAS', 3)),
    orderTimeGap: _.parseInt(getEnv('ORDER_TIME_GAP', 1000)),
    orderRetryTimes: _.parseInt(getEnv('ORDER_RETRY_TIMES', 3)),
  },
  server: {
    port: 3000,
  },
};
