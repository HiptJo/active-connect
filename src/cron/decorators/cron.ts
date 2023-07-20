import { DecorableFunction } from "../../decorator-config";

const cron = require("node-cron");

/**
 * Creates a decorator @Cron("...") to create a cron task.
 *
 * @param crontab - The cron schedule in string format.
 * @returns - The decorator function.
 *
 * @example
 * The following code creates a Cronjob that is executed every hour.
 * ```
 * @Cron("0 * * * *")
 * async runTask() {
 *    // run scheduled tasks
 * }
 * ```
 */
export function Cron(crontab: string) {
  return function _Cron(target: any, propertyKey: string) {
    const obj = new DecorableFunction({ target, propertyKey });
    cron.schedule(crontab, () => {
      const res = obj.Func();
      if (res.then) {
        return res.then();
      } else {
        return res;
      }
    });
  };
}
