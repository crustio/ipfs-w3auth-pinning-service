/**
 * @auther zibo
 * @date 2021/9/6
 */
import * as express from 'express';
import {query, body, param} from 'express-validator';
import {
  PinObjectsQuery,
  PinResults,
  PinStatus,
  Pin,
} from '../models/PinObjects';
import {Failure} from '../models/Failure';
const pinObjectDao = require('../dao/pinObjectDao');
const validate = require('../middlewares/validate/validationHandler');
const {
  TextMatchingStrategy,
  PinObjectStatus,
  isDate,
} = require('./../common/commonUtils');
import {pinByCid, replacePin} from '../service/pinning';
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
    query('status').optional().isIn(_.keys(PinObjectStatus)),
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
    body('name').isString(),
    body('origins').isArray(),
    param('requstId').isString().notEmpty(),
  ]),
  (req, res) => {
    replacePin(
      _.parseInt(req.query.userId),
      req.params.requestId,
      Pin.parsePinFromRequest(req)
    ).then((r: PinStatus) => {
      res.json(r);
    });
  }
);

router.post(
  '/pins',
  validate([
    body('cid').isString().notEmpty().withMessage('cid not empty'),
    body('name').isString(),
    body('origins').optional().isArray(),
  ]),
  (req, res) => {
    pinByCid(_.parseInt(req.query.userId), Pin.parsePinFromRequest(req))
      .then((r: PinStatus) => {
        res.json(r);
      })
      .catch((e: Error) => {
        res.status(500).json(Failure.commonErr(e.message));
      });
  }
);

router.delete('/pins/:requestId', (req, res) => {
  pinObjectDao
    .deletePinObjectByRequestIdAndUserId(req.params.requestId, req.query.userId)
    .then(() => {
      res.sendStatus(200);
    });
});
