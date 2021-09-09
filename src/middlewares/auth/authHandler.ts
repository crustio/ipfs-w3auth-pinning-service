import {Request, Response} from 'express';
import {Failure} from '../../models/Failure';
import {AuthError} from './types';
import SubstrateAuth from './substrateAuth';
import EthAuth from './ethAuth';
import SolanaAuth from './solanaAuth';
const _ = require('lodash');
const Chains = require('./../../models/Chains');
const Users = require('./../../models/Users');
const chainTypes = [
  {
    type: 0,
    authObj: SubstrateAuth,
  },
  {
    type: 1,
    authObj: EthAuth,
  },
  {
    type: 2,
    authObj: SolanaAuth,
  },
];

async function auth(req: Request, res: Response, next: any) {
  // Parse basic auth header 'Authorization: Basic [AuthToken]'
  if (!_.includes(req.headers.authorization, 'Basic ')) {
    res.status(401).json(Failure.commonErr('Empty Signature'));
  } else {
    try {
      const base64Credentials = _.split(
        _.trim(req.headers.authorization),
        ' '
      )[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString(
        'ascii'
      );
      // Parse base64 decoded AuthToken as `[substrate/eth/solana].PubKey:SignedMsg`
      const [passedAddress, sig] = _.split(credentials, ':');
      console.log(
        `Got public address '${passedAddress}' and sigature '${sig}'`
      );

      // Extract signature type. Default to 'substrate' if not specified
      const gaugedAddress = _.includes(passedAddress, '.')
        ? passedAddress
        : `substrate.${passedAddress}`;
      const [sigType, address] = _.split(gaugedAddress, '.');

      // Query chain type by sigType and check signature
      const chain = await Chains.findOne({where: {chain_name: sigType}});
      if (_.isEmpty(chain)) {
        throw new AuthError('Invalid chain name');
      }
      const chainObj = _.find(chainTypes, {type: chain.chain_type});
      if (_.isEmpty(chainObj)) {
        throw new AuthError('Unsupported web3 signature');
      }
      const isValid = chainObj.authObj.auth({
        address,
        signature: sig,
      });
      if (isValid) {
        // Find or create user
        const [user, created] = await Users.findOrCreate({
          where: {chain_type: chain.chain_type, address: address},
          defaults: {chain_type: chain.chain_type, address: address},
        });
        req.query.userId = user.id;
        next();
      } else {
        res.status(401).json(Failure.commonErr('Invalid Signature'));
      }
    } catch (error) {
      console.error(error.message);
      res
        .status(401)
        .json(
          Failure.commonErr(
            error instanceof AuthError ? error.message : 'Invalid Signature'
          )
        );
      return;
    }
  }
}

module.exports = auth;
