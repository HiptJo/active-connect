import { LazyLoading, Outbound } from "../../../src/active-connect";
import { WebsocketMocks } from "../../server/websocket-mocks";

it("should be possible to create a outbound", async () => {
  class Out {
    @Outbound("out.example")
    async send() {
      return { value: "anything1" };
    }
  }
  expect(Out).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();
  const data = await conn.awaitMessage("out.example");
  expect(data).toStrictEqual({ value: "anything1" });
});

describe("lazy loading (default constructor annotation)", () => {
  it("should be possible to request a lazy-loaded outbound", async () => {
    class Out {
      @Outbound("out.requesting0", true)
      async send() {
        return { value: "anything" };
      }
    }
    expect(Out).toBeDefined();
    const conn = WebsocketMocks.getConnectionStub();
    conn.runRequest("request.out.requesting0", null);
    const data = await conn.awaitMessage("out.requesting0");
    expect(data).toStrictEqual({ value: "anything" });
  });
  it("should not auto-send lazy-loaded data", async () => {
    class Out {
      @Outbound("out.requesting1", true)
      async send() {
        return { value: "anything" };
      }
    }
    expect(Out).toBeDefined();
    const conn = WebsocketMocks.getConnectionStub();
    conn.awaitMessage("out.requesting1").then(() => {
      fail("lazy-loaded data has been sent without requesting");
    });
  });
});
describe("lazy loading (separate lazy decorator before)", () => {
  it("should be possible to create a lazy-loaded outbound", async () => {
    class Out {
      @LazyLoading
      @Outbound("out.requesting2")
      async send() {
        return { value: "anything" };
      }
    }
    expect(Out).toBeDefined();
    const conn = WebsocketMocks.getConnectionStub();
    conn.runRequest("request.out.requesting2", null);

    const data = await conn.awaitMessage("out.requesting2");
    expect(data).toStrictEqual({ value: "anything" });
  });
});
describe("lazy loading (separate lazy decorator after)", () => {
  it("should be possible to create a lazy-loaded outbound", async () => {
    class Out {
      @Outbound("out.requesting3")
      @LazyLoading
      async send() {
        return { value: "anything" };
      }
    }
    expect(Out).toBeDefined();
    const conn = WebsocketMocks.getConnectionStub();
    conn.runRequest("request.out.requesting3", null);

    const data = await conn.awaitMessage("out.requesting3");
    expect(data).toStrictEqual({ value: "anything" });
  });
});

it("should be possible to access the `this` object within a outbound", async () => {
  class Out {
    private content: any = { content: "something" };

    @Outbound("out.this")
    async send() {
      return this.content;
    }
  }
  expect(Out).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();

  const data = await conn.awaitMessage("out.this");
  expect(data).toStrictEqual({ content: "something" });
});

it("should be possible to create multiple outbounds", async () => {
  class Out {
    @Outbound("multiple.1")
    async sendA() {
      return 1;
    }
    @Outbound("multiple.2")
    async sendB() {
      return 2;
    }
  }
  expect(Out).toBeDefined();
  const conn = WebsocketMocks.getConnectionStub();

  const data = await conn.awaitMessage("multiple.1");
  expect(data).toStrictEqual(1);
  const data1 = await conn.awaitMessage("multiple.2");
  expect(data1).toStrictEqual(2);
});

describe("error handling", () => {
  it("should send a m.error when a route throws an string (requestable route)", async () => {
    class Testing {
      @Outbound("throws.error.1", true)
      func() {
        throw Error("I am an error1");
      }
    }
    expect(Testing).toBeDefined();
    const conn = WebsocketMocks.getConnectionStub();
    conn.runRequest("request.throws.error.1", null);
    expect(await conn.awaitMessage("m.error")).toBe(
      "Received error message from websocket server: I am an error1"
    );
  });
  it("should send a m.error when a route throws an string (requestable route)", async () => {
    class Testing {
      @Outbound("throws.error.2")
      func() {
        throw Error("I am an error2");
      }
    }
    expect(Testing).toBeDefined();
    const conn = WebsocketMocks.getConnectionStub();
    expect(await conn.awaitMessage("m.error")).toBe("I am an error2");
  });
});
