/**
 * @auther zibo
 * @date 2021/9/6
 */
import * as express from 'express';
const { query } = require('express-validator');
const validate = require('../middlewares/validationHandler');
const { TextMatchingStrategy, PinStatus, isDate } = require('./../common/commonUtils')
const _ = require('lodash')
export const router = express.Router();
router.get('/pins', validate([
        query('cid').optional().custom((value: any) => {
            if (_.isArray(value)) {
                return value.length > 0 && value.length < 10;
            } else {
                return _.isString(value);
            }
        }),
        query('name').optional().isString().isLength({ max: 255}),
        query('match').optional().isIn(_.keys(TextMatchingStrategy)),
        query('status').optional().isIn(_.keys(PinStatus)),
        query('before').custom(isDate),
        query('after').custom(isDate),
        query('limit').optional().isInt({ max: 1000, min: 1}).default(10),
    ]),
    (req, res) => {
        res.json({ success: true});
    });

router.get('/pins/:requestId', (req, res) => {
    res.json({ success: true});
});

router.post('/pins/:requestId', (req, res) => {
    res.json({ success: true});
});

router.post('/pins', (req, res) => {
    res.json({ success: true});
});

router.delete('/pins/:requestId', (req, res) => {
    res.json({ success: true});
});
