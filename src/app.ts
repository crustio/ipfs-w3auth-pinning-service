import * as express from 'express';
import * as cors from 'cors';
import {router as adminRouter} from './routes/admin';
import {router as psaRouter} from './routes/psa';
import * as bodyParser from 'body-parser';
const authHandler = require('./middlewares/auth/authHandler');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use('/admin', adminRouter);
app.use('/psa', authHandler, psaRouter);
app.listen(3000);
