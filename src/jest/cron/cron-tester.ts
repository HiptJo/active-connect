const cron = require("node-cron");

/**
 * A utility class for testing scheduled cronjobs using @Cron(...) annotation.
 */
export class CronTester {
  private static jobs: { crontab: string; func: Function }[] = [];

  private static initialized: boolean = false;

  /**
   * Initializes the CronTester by mocking the cron.schedule method.
   */
  public static init() {
    CronTester.initialized = true;
    cron.schedule = jest.fn().mockImplementation((crontab, func) => {
      CronTester.jobs.push({ crontab, func });
    });
  }

  /**
   * Tests if a cron job with the specified crontab exists and executes the associated function.
   * @param crontab - The crontab schedule string.
   * @returns A promise that resolves with the value returned by the executed function.
   * @throws If the CronTester has not been initialized.
   */
  public static test(crontab: string): Promise<any> {
    if (!CronTester.initialized) {
      throw Error(
        "The cron-tester was not initialized. Please call CronTester.init() before running tests."
      );
    }

    if (CronTester.jobs.filter((j) => j.crontab == crontab).length == 0) {
      throw Error("Cronjob was not found");
    }

    return new Promise(async (resolve) => {
      const value = await CronTester.jobs
        .filter((j) => j.crontab == crontab)[0]
        .func();
      resolve(value);
    });
  }
}
