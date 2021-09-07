/**
 * @auther zhouzibo
 * @date 2021/9/6
 */
import * as moment from 'moment';
module.exports = {
  TextMatchingStrategy: {
    exact: 'exact',
    iexact: 'iexact',
    partial: 'partial',
    ipartial: 'ipartial',
  },
  PinObjectStatus: {
    queued: 'queued',
    pinning: 'queued',
    pinned: 'pinned',
    failed: 'failed',
  },
  isDate: (value: string): boolean => {
    return moment(value).isValid();
  },
  getEnv: (value: string, defaultValue: any): any => {
    return process.env[value] || defaultValue;
  },
};
