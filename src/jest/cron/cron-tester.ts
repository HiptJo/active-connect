const cron = require("node-cron");

export class CronTester {
  private static jobs: { crontab: string; func: Function }[] = [];

  private static initialized: boolean = false;

  public static init() {
    CronTester.initialized = true;
    cron.schedule = jest.fn().mockImplementation((crontab, func) => {
      CronTester.jobs.push({ crontab, func });
    });
  }

  public static test(crontab: string): Promise<any> {
    if (!CronTester.initialized) {
      throw Error(
        "The cron-tester was not initialized. Please call CronTester.init() before running tests."
      );
    }
    expect(
      CronTester.jobs.filter((j) => j.crontab == crontab).length
    ).toBeGreaterThan(0);
    return new Promise(async (resolve) => {
      const value = await CronTester.jobs
        .filter((j) => j.crontab == crontab)[0]
        .func();
      resolve(value);
    });
  }
}
