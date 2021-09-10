import * as express from 'express';
import * as cors from 'cors';
import {router as psaRouter} from './routes/psa';
import * as bodyParser from 'body-parser';
const authHandler = require('./middlewares/auth/authHandler');
const schedule = require('node-schedule');
import {updatePinObjectStatus} from './service/pinning';
import {logger} from './logger';

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use('/psa', authHandler, psaRouter);
app.listen(3000);

schedule.scheduleJob('0 0 * * * *', () => {
  logger.info('schedule start');
  updatePinObjectStatus()
    .then(() => {
      logger.info('schedule finished');
    })
    .catch((e: Error) => {
      logger.error(`updatePinObjectStatus err: ${e.message}`);
    });
});
