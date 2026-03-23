import winston from "winston";

/**
 * Logger instance configured with Winston.
 * 
 * Outputs logs to both console and file (reports/test.log).
 * Format: `TIMESTAMP [LEVEL] message`
 * 
 * @example
 * ```typescript
 * import { logger } from '../utils/logger';
 * 
 * logger.info('Test started');
 * logger.error('Test failed: ' + error.message);
 * logger.warn('Deprecated method used');
 * ```
 */
export const logger = winston.createLogger({
  /** Minimum log level to output */
  level: "info",

  /** Log format configuration */
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),

  /** Output destinations */
  transports: [
    /** Console output for real-time visibility */
    new winston.transports.Console(),

    /** File output for persistent logging */
    new winston.transports.File({
      filename: "reports/test.log"
    })
  ]
});
