import { Cron } from "../../../src";
import { CronTester } from "../../../src/jest";

beforeAll(() => {
  CronTester.init();
});
it("should be possible to schedule a cronjob (async method)", async () => {
  class Testing {
    private val = 1;
    @Cron("1 2 3 4 5")
    async cron() {
      return this.val++;
    }
  }
  expect(Testing).toBeDefined();
  expect(await CronTester.test("1 2 3 4 5")).toBe(1);
});
it("should be possible to schedule a cronjob (sync method)", async () => {
  class Testing {
    private val = 2;
    @Cron("1 2 3 4 6")
    cron() {
      return this.val++;
    }
  }
  expect(Testing).toBeDefined();
  expect(await CronTester.test("1 2 3 4 6")).toBe(2);
});
