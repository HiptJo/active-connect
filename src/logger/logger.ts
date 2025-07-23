import { createLogger, format, transports, Logger } from "winston";
import * as DailyRotateFile from "winston-daily-rotate-file";
import { asyncLocalStorage } from "./async-local-storage";
import { WebsocketConnection } from "..";

const { combine, timestamp, printf, colorize, errors, splat } = format;

// Define custom log format
const logFormat = (useTimestamp: boolean) =>
  printf(({ level, message, timestamp, stack, module, auth }: any) => {
    const store = asyncLocalStorage.getStore() || {};

    let prefix = "";
    if (module) {
      prefix += ` [${module}]`;
    }

    if (store.path) {
      prefix += ` [${store.path}]`;
    }

    let data = [];
    if (store.connection) {
      data.push("connectionId=" + (store.connection as WebsocketConnection).id);
      data.push(
        "auth=" + (store.connection as WebsocketConnection).description
      );
    }
    if (store.objectId) {
      data.push("objectId=" + store.objectId);
    }
    if (store.trigger) {
      data.push("trigger=" + store.trigger);
    }

    if (data.length > 0) {
      prefix += ` [${data.join(" ")}]`;
    }

    const log = `${level}${prefix}: ${stack || message}`;
    if (useTimestamp) {
      return `${timestamp} ${log}`;
    }
    return log;
  });

// File transport (non-colorized, persistent logs)
const dailyRotateTransport: DailyRotateFile = new DailyRotateFile({
  dirname: "logs",
  filename: "app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: false,
  maxFiles: "7d",
  level: process.env.LOG_LEVEL_FILE || "debug",
  format: combine(
    timestamp(),
    errors({ stack: true }),
    splat(),
    logFormat(true)
  ),
});

const dailyRotateErrorTransport: DailyRotateFile = new DailyRotateFile({
  dirname: "logs",
  filename: "error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: false,
  maxFiles: "30d",
  level: process.env.LOG_LEVEL_ERROR || "warn",
  format: combine(
    timestamp(),
    errors({ stack: true }),
    splat(),
    logFormat(true)
  ),
});

// Create logger instance
const logger: Logger = createLogger({
  level: "debug",
  transports: [
    dailyRotateErrorTransport,
    dailyRotateTransport,
    new transports.Console({
      level: process.env.LOG_LEVEL || "info",
      format: combine(
        colorize({ all: true }),
        timestamp(),
        splat(),
        logFormat(false),
        errors({ stack: true })
      ),
    }),
  ],
  exceptionHandlers: [dailyRotateErrorTransport],
  rejectionHandlers: [dailyRotateErrorTransport],
});

const wsLogger = logger.child({ module: "ws" });
const httpLogger = logger.child({ module: "http" });
const cronLogger = logger.child({ module: "cron" });
const appLogger = logger.child({ module: "app" });
export { logger, wsLogger, httpLogger, cronLogger, appLogger };
