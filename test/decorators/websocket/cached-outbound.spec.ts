import {
  Outbound,
  Subscribe,
  SupportsCache,
  StandaloneRoute,
  Modifies,
  WebsocketAuthenticator,
  WebsocketConnection,
  Auth,
  LazyLoading,
} from "../../../src";
import { WebsocketMocks } from "../../server/websocket-mocks";

class Authenticator extends WebsocketAuthenticator {
  public label: string = "auth";
  public unauthenticatedMessage: string = "unauth";
  public async authenticate(
    conn: string | WebsocketConnection,
    requestData: any
  ): Promise<boolean> {
    if ((conn as WebsocketConnection)?.token)
      return (conn as WebsocketConnection).token == "true";
    return false;
  }
}
expect(Authenticator).toBeDefined();

describe("eager-loaded outbound", () => {
  class Testing {
    public static data: number[] = [];

    @Auth(new Authenticator())
    @Outbound("out.cached")
    @Subscribe
    @SupportsCache
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
    const conn = WebsocketMocks.getConnectionStub(true, "true");
    const method = await conn.expectCacheRequest("out.cached");
    expect(method).toBe("out.cached");
    conn.runRequest("___cache", {
      method,
      specificHash: null,
    });
    let _s: number = 0;
    const data = await conn.expectMethod(
      "out.cached",
      undefined,
      (specificHash) => {
        expect(specificHash).toBeDefined();
        _s = specificHash;
      }
    );
    expect(data).toHaveLength(0);
    conn.runRequest("cached.update", 7);
    await conn.expectMethod("out.cached", undefined, (specificHash) => {
      expect(specificHash).not.toBe(_s);
      _s = specificHash;
    });
    expect(_s).toBeDefined();

    // should be possible to use the cache tokens to approve it has not been changed
    const c1 = WebsocketMocks.getConnectionStub(true, "true");
    expect(await c1.expectCacheRequest("out.cached")).toBe("out.cached");
    c1.runRequest("___cache", {
      method,
      specificHash: _s,
    });
    expect(await c1.expectMethod("out.cached")).toBe("cache_restore");

    // should send updated data when old specific identifier is used
    const c3 = WebsocketMocks.getConnectionStub(true, "true");
    expect(await c3.expectCacheRequest("out.cached")).toBe("out.cached");
    c3.runRequest("___cache", {
      method,
      specificHash: _s - 1,
    });
    expect(await c3.expectMethod("out.cached")).not.toBe("cache_restore");
  });
});

describe("lazy-loaded outbound", () => {
  class Testing {
    public static data: number[] = [];

    @Auth(new Authenticator())
    @Outbound("out.cached1")
    @LazyLoading
    @Subscribe
    @SupportsCache
    async getData() {
      return Testing.data;
    }

    @StandaloneRoute("cached.update1")
    @Modifies("out.cached1")
    add(value: number) {
      Testing.data.push(value);
    }
  }
  expect(Testing).toBeDefined();
  it("should be possible to access data as client with cache support", async () => {
    const conn = WebsocketMocks.getConnectionStub(true, "true");
    conn.runRequest("request.out.cached1", null);
    const method = await conn.expectCacheRequest("out.cached1");
    conn.runRequest("___cache", {
      method,
      specificHash: null,
    });
    let _s: number = 0;
    const data = await conn.expectMethod(
      "out.cached1",
      undefined,
      (specificHash) => {
        expect(specificHash).toBeDefined();
        _s = specificHash;
      }
    );
    expect(data).toHaveLength(0);
    conn.runRequest("cached.update1", 7);
    await conn.expectMethod("out.cached1", undefined, (specificHash) => {
      expect(specificHash).not.toBe(_s);
      _s = specificHash;
    });
    expect(_s).toBeDefined();

    // should be possible to use the cache tokens to approve it has not been changed
    const c1 = WebsocketMocks.getConnectionStub(true, "true");
    c1.runRequest("request.out.cached1", null);
    expect(await c1.expectCacheRequest("out.cached1")).toBe("out.cached1");
    c1.runRequest("___cache", {
      method,
      specificHash: _s,
    });
    expect(await c1.expectMethod("out.cached1")).toBe("cache_restore");

    // should send updated data when old specific identifier is used
    const c3 = WebsocketMocks.getConnectionStub(true, "true");
    c3.runRequest("request.out.cached1", null);
    expect(await c3.expectCacheRequest("out.cached1")).toBe("out.cached1");
    c3.runRequest("___cache", {
      method,
      specificHash: _s - 1,
    });
    expect(await c3.expectMethod("out.cached1")).not.toBe("cache_restore");
  });
});

it("should not send cache request when authentication does not match", async () => {
  const conn = WebsocketMocks.getConnectionStub(true);
  conn.dontExpectMethod("___cache");
});

it("should send clear command when authentication fails for ___cache command", async () => {
  const conn = WebsocketMocks.getConnectionStub(true);
  conn.runRequest("___cache", {
    method: "out.cached",
    specificHash: 100,
  });
  expect(await conn.expectMethod("out.cached")).toBe("cache_delete");
});
