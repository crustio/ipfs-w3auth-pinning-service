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
    chainWsUrl: getEnv(
      process.env.WS_ENDPOINT,
      'wss://rpc-crust-mainnet.decoo.io'
    ),
    defaultFileSize: _.parseInt(getEnv('DEFAULT_FILE_SIZE', 2147483648)),
    tips: getEnv('CRUST_TIPS', 0),
    validFileSize: _.parseInt(getEnv('VALID_FILE_REPLICAS', 30)),
    orderTimeAwait: _.parseInt(getEnv('ORDER_TIME_AWAIT', 3000)),
    loopTimeAwait: _.parseInt(getEnv('LOOP_TIME_AWAIT', 20000)),
    checkAmountTimeAwait: _.parseInt(getEnv('CHECK_AMOUNT_TIME_AWAIT', 120000)),
    checkAmountRetryTimes: _.parseInt(getEnv('CHECK_AMOUNT_RETRY_TIMES', 3)),
    orderRetryTimes: _.parseInt(getEnv('ORDER_RETRY_TIMES', 3)),
    publicKey: getEnv(
      'CRUST_ORDER_PUBLIC_KEY',
      'cTKR5K5FdMJcZD3275PACRj7Ngwwv5MQB6zKWWnsxNe9V6uGm'
    ),
    minimumAmount: _.parseInt(getEnv('MINIMUM_AMOUNT', 2)),
    warningAccessToken: getEnv(
      'WARNING_ACCESSTOKEN',
      'e9b202bc3bec659f31c3948295aa1864c96812c456ab3e167ed8c1e56937eaf6'
    ),
    transactionTimeout: _.parseInt(getEnv('TRANSACTION_TIMEOUT', 60 * 1000)),
  },
  server: {
    port: 3000,
    name: getEnv('NODE_ENV', 'prod'),
  },
};
