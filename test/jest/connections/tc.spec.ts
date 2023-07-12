import { StandaloneRoute } from "../../../src";
import { TCWrapper } from "../../../src/integration-testing/";

describe("onError handling", () => {
  it("should trigger onError", (d) => {
    const conn = new TCWrapper();
    conn.expectError().then(d);
    conn.send("m.error", undefined);
  });
  it("should raise an exception once the error has been expected once", () => {
    const conn = new TCWrapper();
    conn.expectError().then();
    conn.send("m.error", undefined);
    try {
      conn.send("m.error", undefined);
    } catch (e) {}
  });
});

describe("message timeout", () => {
  it("should raise an error when a message is not received for 3000ms", async () => {
    class Testing {
      @StandaloneRoute("noresolve")
      nonResolvingMethod() {
        return new Promise((resolve) => {});
      }
    }
    expect(Testing).toBeDefined();
    const conn = new TCWrapper();
    conn.send("noresolve", null);

    await expect(conn.expectMethod("m.noresolve")).rejects.toBe(
      "ActiveConnect: Message was not received within the timout inverval of 3000ms: m.noresolve"
    );
  });
});
