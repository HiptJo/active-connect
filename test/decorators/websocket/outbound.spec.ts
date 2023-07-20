import {
  LazyLoading,
  Modifies,
  ModifiesAuthentication,
  Outbound,
  ResendAfterAuthenticationChange,
  Route,
  StandaloneRoute,
  Subscribe,
  SupportsCache,
  WebsocketOutboundCacheKeyProvider,
  WebsocketOutbounds,
} from "../../../src";
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

describe("caching", () => {
  class MyProvider extends WebsocketOutboundCacheKeyProvider {
    async getHashCode(): Promise<number> {
      return Testing.data.length + 1;
    }
  }

  class Testing {
    public static data: number[] = [];

    @Outbound("out.cached")
    @Subscribe
    @SupportsCache(new MyProvider())
    async getData() {
      return Testing.data;
    }

    @StandaloneRoute("cached.update")
    @Modifies("out.cached")
    add(value: number) {
      Testing.data.push(value);
    }
  }
  it("should be possible to access data as client with cache support", async () => {
    const conn = WebsocketMocks.getConnectionStub(true);
    const method = await conn.expectMethod("___cache");
    expect(method).toBe("out.cached");
    conn.runRequest("___cache", {
      method,
      globalHash: null,
      specificHash: null,
    });
    let _g: number = 0,
      _s: number = 0;
    const data = await conn.expectMethod(
      "out.cached",
      undefined,
      (globalHash, specificHash) => {
        expect(globalHash).toBe(1);
        expect(specificHash).toBeDefined();
        _g = globalHash;
        _s = specificHash;
      }
    );
    expect(data).toHaveLength(0);
    conn.runRequest("cached.update", 7);
    await conn.expectMethod(
      "out.cached",
      undefined,
      (globalHash, specificHash) => {
        expect(specificHash).not.toBe(_s);
        _g = globalHash;
        _s = specificHash;
      }
    );
    expect(_g).toBe(2);
    expect(_s).toBeDefined();

    // should be possible to use the cache tokens to approve it has not been changed
    const c1 = WebsocketMocks.getConnectionStub(true);
    expect(await c1.expectMethod("___cache")).toBe("out.cached");
    c1.runRequest("___cache", {
      method,
      globalHash: _g,
      specificHash: _s,
    });
    expect(await c1.expectMethod("out.cached")).toBe("cache_restore");

    // should send updated data when old global identifier is used
    const c2 = WebsocketMocks.getConnectionStub(true);
    expect(await c2.expectMethod("___cache")).toBe("out.cached");
    c2.runRequest("___cache", {
      method,
      globalHash: _g - 1,
      specificHash: _s,
    });
    expect(await c2.expectMethod("out.cached")).not.toBe("cache_restore");

    // should send updated data when old specific identifier is used
    const c3 = WebsocketMocks.getConnectionStub(true);
    expect(await c3.expectMethod("___cache")).toBe("out.cached");
    c3.runRequest("___cache", {
      method,
      globalHash: _g,
      specificHash: _s - 1,
    });
    expect(await c3.expectMethod("out.cached")).not.toBe("cache_restore");
  });
});
