import { StandaloneRoute } from "../../../src";
import { TCWrapper } from "../../../src/integration-testing/";

describe("onError handling", () => {
  it("should trigger onError", (d) => {
    const conn = new TCWrapper();
    conn.expectError().then(() => {
      d();
    });
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

describe("connection testing (tcwrapper)", () => {
  let conn: TCWrapper;
  beforeEach(() => {
    conn = new TCWrapper();
  });

  it("should be possible to send data", async () => {
    const value = { value: "i am okay" };
    class Testing {
      @StandaloneRoute("standalone.r1")
      async route() {
        return value;
      }
    }
    expect(Testing).toBeDefined();

    conn.runRequest("standalone.r1", true);
    const data = await conn.expectMethod("m.standalone.r1");
    expect(data).toStrictEqual(value);
  });
  it("should be possible to send false", (d) => {
    const value = false;
    conn.expectMethod("message.testing").then((data) => {
      expect(data).toStrictEqual(value);
      d();
    });
    conn.send("message.testing", value);
  });
  it("should be possible to await sent data", (d) => {
    const value = { value: "i am okay" };
    conn.expectMethod("message.testing").then((data) => {
      expect(data).toStrictEqual(value);
      d();
    });
    conn.send("message.testing", value);
  });
});

it("should raise an error when a message without message-id is received", async () => {
  class Testing {
    @StandaloneRoute("standalone.nomessageid")
    async route() {
      fail("no message id has been provided");
    }
  }
  expect(Testing).toBeDefined();

  const conn = new TCWrapper();
  conn.runRequest("standalone.nomessageid", true);
  expect(
    ((await conn.expectMethod("m.error")) as string).includes("no messageId")
  );
});

describe("message timeout", () => {
  it("should raise an error when a message is not received for 3000ms", async () => {
    class Testing {
      @StandaloneRoute("s.noresolve1")
      nonResolvingMethod() {
        return new Promise((resolve) => {});
      }
    }
    expect(Testing).toBeDefined();

    const conn = new TCWrapper();
    conn.send("s.noresolve1", null);
    await expect(conn.expectMethod("m.s.noresolve1")).rejects.toBe(
      "ActiveConnect: Message was not received within the timout inverval of 3000ms: m.s.noresolve1"
    );
  });
  it("should not receive a method", async () => {
    class Testing {
      @StandaloneRoute("s.noresolve2")
      nonResolvingMethod() {
        return new Promise((resolve) => {});
      }
      @StandaloneRoute("s.resolve2")
      async resolve2() {
        return true;
      }
    }
    expect(Testing).toBeDefined();

    const conn = new TCWrapper();
    conn.runRequest("s.resolve2", null);
    await expect(conn.dontExpectMethod("m.s.resolve2")).rejects.toBe(
      "ActiveConnect: did receive unexpected method m.s.resolve2"
    );
  });
});
