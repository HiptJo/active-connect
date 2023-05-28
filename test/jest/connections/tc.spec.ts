import { TCWrapper } from "../../../src/jest/";

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
