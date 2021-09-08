/**
 * @auther zibo
 * @date 2021/9/6
 */
import * as express from 'express';
import {query, body} from 'express-validator';
import {PinObjectsQuery, PinResults, PinStatus} from '../models/PinObjects';
import {Failure} from '../models/Failure';
const pinObjectDao = require('../dao/pinObjectDao');
const validate = require('../middlewares/validate/validationHandler');
const {TextMatchingStrategy, isDate} = require('./../common/commonUtils');
const _ = require('lodash');
export const router = express.Router();
router.get(
  '/pins',
  validate([
    query('cid')
      .optional()
      .custom((value: any) => {
        if (_.isArray(value)) {
          return value.length > 0 && value.length < 10;
        } else {
          return _.isString(value);
        }
      }),
    query('name').optional().isString().isLength({max: 255}),
    query('match').optional().isIn(_.keys(TextMatchingStrategy)),
    query('status').optional().isIn(_.keys(PinStatus)),
    query('before').custom(isDate),
    query('after').custom(isDate),
    query('limit').default(10).isInt({max: 1000, min: 1}),
  ]),
  (req, res) => {
    pinObjectDao
      .selectPinObjectListByQuery(PinObjectsQuery.parseQuery(req))
      .then((r: PinResults) => {
        res.json(r);
      });
  }
);

router.get('/pins/:requestId', (req, res) => {
  pinObjectDao
    .selectPinObjectByRequestIdAndUserId(req.params.requestId, req.query.userId)
    .then((r: PinStatus) => {
      if (_.isEmpty(r)) {
        res.status(400).json(Failure.commonErr('not found'));
      } else {
        res.json(r);
      }
    });
});

router.post(
  '/pins/:requestId',
  validate([
    body('cid').isString().notEmpty().withMessage('cid not empty'),
    body(''),
  ]),
  (req, res) => {
    res.json({success: true});
  }
);

router.post('/pins', (req, res) => {
  res.json({success: true});
});

router.delete('/pins/:requestId', (req, res) => {
  pinObjectDao
    .deletePinObjectByRequestIdAndUserId(req.params.requestId, req.query.userId)
    .then(() => {
      res.sendStatus(200);
    });
});
