/**
 * @auther zhouzibo
 * @date 2021/9/6
 * @license Copyright (c) 2018 那镁克
 */

const moment = require('moment');

module.exports = {
    TextMatchingStrategy: {
        exact: 0,
        iexact: 1,
        partial: 2,
        ipartial: 3
    },
    PinStatus: {
        queued: 0,
        pinning: 1,
        pinned: 2,
        failed: 3
    },
    isDate: (value: String): boolean => {
        return moment(value).isValid()
    },
    getEnv: (value: String, defaultValue: any): any => {
        // @ts-ignore
        return process.env[value] || defaultValue;
    }
}


