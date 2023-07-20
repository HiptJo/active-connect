import { Shared } from "../../../src";

it("should be possible to decorate a method using @Shared", async () => {
  class Testing {
    @Shared()
    public data = "";
  }
  expect(Testing).toBeDefined();
  expect(new Testing().data).toBeDefined();
});
it("should raise an error when a defaultValue is passed to the shared decorator as this is no longer supported", async () => {
  expect(() => {
    class Testing {
      @Shared("example")
      public data: any = null;
    }
    expect(Testing).toBeDefined();
  }).toThrow(
    "Active-Connect/@Shared: defaultValue is no longer supported, please assign the value to the variable itself."
  );
});
