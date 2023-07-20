import {
  WebsocketOutboundCacheKeyProvider,
  Outbound,
  Subscribe,
  SupportsCache,
  StandaloneRoute,
  Modifies,
  WebsocketAuthenticator,
  WebsocketConnection,
  Auth,
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
  class MyProvider extends WebsocketOutboundCacheKeyProvider {
    async getHashCode(): Promise<number> {
      return Testing.data.length + 1;
    }
  }

  class Testing {
    public static data: number[] = [];

    @Auth(new Authenticator())
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
    const conn = WebsocketMocks.getConnectionStub(true, "true");
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
    const c1 = WebsocketMocks.getConnectionStub(true, "true");
    expect(await c1.expectMethod("___cache")).toBe("out.cached");
    c1.runRequest("___cache", {
      method,
      globalHash: _g,
      specificHash: _s,
    });
    expect(await c1.expectMethod("out.cached")).toBe("cache_restore");

    // should send updated data when old global identifier is used
    const c2 = WebsocketMocks.getConnectionStub(true, "true");
    expect(await c2.expectMethod("___cache")).toBe("out.cached");
    c2.runRequest("___cache", {
      method,
      globalHash: _g - 1,
      specificHash: _s,
    });
    expect(await c2.expectMethod("out.cached")).not.toBe("cache_restore");

    // should send updated data when old specific identifier is used
    const c3 = WebsocketMocks.getConnectionStub(true, "true");
    expect(await c3.expectMethod("___cache")).toBe("out.cached");
    c3.runRequest("___cache", {
      method,
      globalHash: _g,
      specificHash: _s - 1,
    });
    expect(await c3.expectMethod("out.cached")).not.toBe("cache_restore");
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
    globalHash: 100,
    specificHash: 100,
  });
  expect(await conn.expectMethod("out.cached")).toBe("cache_delete");
});
