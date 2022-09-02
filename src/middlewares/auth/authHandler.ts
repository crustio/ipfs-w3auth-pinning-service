import { Request } from 'express';
import { logger } from '../../logger';
const _ = require('lodash');
const Users = require('./../../models/Users');

async function auth(req: Request, res: any, next: any) {
  const chainType = res.chainType;
  let address = res.chainAddress;

  logger.info(`Validate chainType: ${chainType} address: ${address} success`);
  logger.info(`txMsg: ${res.txMsg} tyMsg: ${res.tyMsg}`)
  if (chainType == "xx") {
    address = res.txMsg
  } 
  // Find or create user
  const [user, created] = await Users.findOrCreate({
    where: { chain_type: chainType, address: address },
    defaults: { chain_type: chainType, address: address },
  });

  req.query.userId = user.id;
  next();
}

module.exports = auth;
