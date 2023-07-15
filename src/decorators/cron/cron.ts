import { DecorableFunction } from "../../server";

const cron = require("node-cron");

/**
 * @decorator
 * Creates a decorator @Cron("...") to create a cron task.
 * @param crontab - The cron schedule in string format.
 * @returns - The decorator function.
 */
export function Cron(crontab: string) {
  return function _Cron(target: any, propertyKey: string) {
    const obj = new DecorableFunction({ target, propertyKey });
    cron.schedule(crontab, () => {
      obj.Func().then();
    });
  };
}
