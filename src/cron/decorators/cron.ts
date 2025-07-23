import { DecorableFunction } from "../../decorator-config";
import { cronLogger } from "../../logger/logger";

const cron = require("node-cron");

/**
 * Creates a decorator @Cron("...") to create a cron task.
 *
 * @param crontab - The cron schedule in string format.
 * @param label - The optional label of the cronjob.
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
export function Cron(crontab: string, label: string = "") {
  return function _Cron(target: any, propertyKey: string) {
    const obj = new DecorableFunction({ target, propertyKey });
    cron.schedule(crontab, () => {
      cronLogger.debug("Running " + label);
      const res = obj.Func();
      if (res.then) {
        return res.then();
      } else {
        return res;
      }
    });
  };
}
