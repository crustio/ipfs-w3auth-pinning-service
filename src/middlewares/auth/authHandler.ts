import {Request} from 'express';
import {logger} from '../../logger';
const _ = require('lodash');
const Users = require('./../../models/Users');

async function auth(req: Request, res: any, next: any) {
  const chainType = res.chainType;
  const address = res.chainAddress;
  
  logger.info(`Validate chainType: ${chainType} address: ${address} success`);
  logger.info(`txMsg: ${res.txMsg} tyMsg: ${res.tyMsg}`)
  // Find or create user
  const [user, created] = await Users.findOrCreate({
    where: {chain_type: chainType, address: res.tyMsg},
    defaults: {chain_type: chainType, address: res.tyMsg},
  });
  req.query.userId = user.id;
  next();
}

module.exports = auth;
