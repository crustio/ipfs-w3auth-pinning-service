import * as express from 'express';
import * as cors from 'cors';
import {router as psaRouter} from './routes/psa';
import * as bodyParser from 'body-parser';
const pinningAuthHandler = require('./middlewares/auth/authHandler');
const w3authHandler = require('@crustio/ipfs-w3auth-handler');
const Postgrator = require('postgrator');
const path = require('path');
import {updatePinObjectStatus, orderStart, pinExpireFiles} from './service/pinning';
import {configs} from './config/config';

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(w3authHandler);
app.use('/psa', pinningAuthHandler, psaRouter);

const postgrator = new Postgrator({
  migrationDirectory: path.join(__dirname, configs.evolution.location),
  schemaTable: configs.evolution.schema_table,
  driver: 'mysql2',
  host: configs.db.host,
  port: configs.db.port,
  database: configs.db.db,
  username: configs.db.user,
  password: configs.db.password,
});

postgrator.migrate('max').then((migrations: any) => {
    app.listen(configs.server.port);
    updatePinObjectStatus();
    orderStart();
    pinExpireFiles();
});
