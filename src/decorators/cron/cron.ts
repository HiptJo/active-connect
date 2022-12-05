const cron = require("node-cron");

export function Cron(crontab: string) {
  return function _GET(target: any, propertyKey: string) {
    cron.schedule(crontab, target[propertyKey].bind(target.___data));
  };
}
