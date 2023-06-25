const cron = require("node-cron");

/**
 * @decorator
 * Creates a decorator @Cron("...") to create a cron task.
 * @param crontab - The cron schedule in string format.
 * @returns - The decorator function.
 */
export function Cron(crontab: string) {
  /**
   * Decorator function to bind a cron task to the target method.
   * @param target - The target object.
   * @param propertyKey - The property key of the target method.
   */
  return function _Cron(target: any, propertyKey: string) {
    cron.schedule(crontab, target[propertyKey].bind(target.___data));
  };
}
