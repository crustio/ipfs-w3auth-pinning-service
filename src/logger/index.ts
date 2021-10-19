import * as winston from 'winston';

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf(
      info => `[${info.level}] [${[info.timestamp]}] ${info.message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({filename: 'logger.log'}),
  ],
});
