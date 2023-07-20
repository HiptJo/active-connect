import { Cron } from "../../../src";
import { CronTester } from "../../../src/jest";

it("should throw when testing cronjobs without initializing", () => {
  expect(() => {
    CronTester.test("1 2 3");
  }).toThrow(
    "The cron-tester was not initialized. Please call CronTester.init() before running tests."
  );
});
describe("test cronjobs", () => {
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
  it("should throw when testing a non-existing job", async () => {
    await expect(async () => {
      await CronTester.test("1 2 3 4 6 _ _");
    }).rejects.toThrow("Cronjob was not found");
  });
});
