import {
  LazyLoading,
  ModifiesAuthentication,
  Outbound,
  ResendAfterAuthenticationChange,
  Route,
  StandaloneRoute,
  Subscribe,
  WebsocketOutbounds,
} from "../../../src/active-connect";
import { testEach } from "../../../src/jest";
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
  const data = await conn.expectMethod("out.example");
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
    const data = await conn.expectMethod("out.requesting0");
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
    conn.dontExpectMethod("out.requesting1");
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

    const data = await conn.expectMethod("out.requesting2");
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

    const data = await conn.expectMethod("out.requesting3");
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

  const data = await conn.expectMethod("out.this");
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

  const data = await Promise.all([
    conn.expectMethod("multiple.1"),
    conn.expectMethod("multiple.2"),
  ]);
  expect(data).toStrictEqual([1, 2]);
});

describe("error handling", () => {
  it("should send a m.error when a route throws an error object (requestable route)", async () => {
    class Testing {
      @Outbound("throws.error.1", true)
      func() {
        throw Error("I am an error1");
      }
    }
    expect(Testing).toBeDefined();
    const conn = WebsocketMocks.getConnectionStub();
    conn.runRequest("request.throws.error.1", null);
    expect(await conn.expectMethod("m.error")).toBe("I am an error1");
  });
  it("should send a m.error when a route throws an string (requestable route)", async () => {
    class Testing {
      @Outbound("throws.error.2")
      func() {
        throw "I am an error2";
      }
    }
    expect(Testing).toBeDefined();
    const conn = WebsocketMocks.getConnectionStub();
    expect(await conn.expectMethod("m.error")).toBe("I am an error2");
  });
  afterAll(() => {
    // clear after execution to remove outbound `throw.error.2`
    WebsocketOutbounds.removeOutboundByMethod("throws.error.2");
  });
});

describe("Outbound resend after auth change", () => {
  beforeEach(() => {
    Testing.value.value = "oldvalue1";
  });

  @Route("auth1")
  class Testing {
    public static value: any = { value: "oldvalue1" };

    @Outbound("out3.auth")
    @Subscribe
    @ResendAfterAuthenticationChange
    public async sendData1() {
      return Testing.value;
    }

    @ModifiesAuthentication
    @StandaloneRoute("standalone.auth")
    public async standalone1(value: any) {
      Testing.value = value;
    }

    @Route("auth1")
    @ModifiesAuthentication
    public async subscribe1(value: any) {
      Testing.value = value;
    }

    @Outbound("out4.auth", false, true)
    public async sendData2() {
      return Testing.value;
    }

    @StandaloneRoute("standalone.auth1", true)
    public async standalone2(value: any) {
      Testing.value = value;
    }

    @Route("auth2", undefined, true)
    public async subscribe2(value: any) {
      Testing.value = value;
    }
  }

  const regularRoutes: string[] = ["out3.auth", "auth1.auth1"];
  const standaloneRoutes: string[] = ["out3.auth", "standalone.auth"];
  const inRegularRoutes: string[] = ["out4.auth", "auth1.auth2"];
  const inStandaloneRoutes: string[] = ["out4.auth", "standalone.auth1"];

  testEach(
    [regularRoutes, standaloneRoutes, inRegularRoutes, inStandaloneRoutes],
    [
      "routes&decorator",
      "standalone-routes&decorator",
      "routes&in",
      "standalone-routes&in",
    ],
    (routes: string[], label: string) => {
      it(label + ": should re-send data after auth change", async () => {
        expect(Testing).toBeDefined();
        const conn = WebsocketMocks.getConnectionStub();
        const data = await conn.expectMethod(routes[0]);
        expect(data).toStrictEqual({ value: "oldvalue1" });
        conn.runRequest(routes[1], { value: "updated" });
        expect(Testing.value).toStrictEqual({ value: "updated" });
        const resentData = await conn.expectMethod(routes[0]);
        expect(resentData).toStrictEqual({ value: "updated" });
      });
    }
  );

  it("should raise an error when the modifiesAuthentication tag is used on class-level", async () => {
    expect(() => {
      @Route("test", undefined, true)
      class Testing {}
      expect(Testing).toBeDefined();
    }).toThrow(
      "Modifies-Authentication mode is not support for class annotation"
    );
  });
});

describe("outbound duplicate label checks", () => {
  it("should raise an error when a two outbounds with the same method are registered", () => {
    expect(() => {
      class Testing {
        @Outbound("out.duplicate")
        get1() {
          return 1;
        }

        @Outbound("out.duplicate")
        get2() {
          return 2;
        }
      }
      expect(Testing).toBeDefined();
    }).toThrow(
      "Two outbounds have been registered using the same method (out.duplicate)"
    );
  });
});
