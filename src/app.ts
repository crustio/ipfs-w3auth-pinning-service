import * as express from 'express';
import * as cors from 'cors';
import {router as psaRouter} from './routes/psa';
import * as bodyParser from 'body-parser';
const authHandler = require('./middlewares/auth/authHandler');
const schedule = require('node-schedule');
import {updatePinObjectStatus, orderQueuedFiles} from './service/pinning';
import {logger} from './logger';

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use('/psa', authHandler, psaRouter);
app.listen(3000);

schedule.scheduleJob('0 * * * * *', () => {
  logger.info('pin status schedule start');
  updatePinObjectStatus()
    .then(() => {
      logger.info('pin status schedule finished');
    })
    .catch((e: Error) => {
      logger.error(`pin status update err: ${e.message}`);
    });
});

schedule.scheduleJob('0 */2 * * * *', () => {
  logger.info('order schedule start');
  orderQueuedFiles()
    .then(() => {
      logger.info('order schedule finished');
    })
    .catch((e: Error) => {
      logger.error(`order status err: ${e.message}`);
    });
});
